package security

import (
	"crypto/rand"
	"crypto/sha256"
	"crypto/subtle"
	"encoding/base64"
	"fmt"
	"strconv"
	"strings"

	"golang.org/x/crypto/argon2"
)

const passwordIterations = 120000

const (
	argonTime    uint32 = 1
	argonMemory  uint32 = 64 * 1024
	argonThreads uint8  = 4
	argonKeyLen  uint32 = 32
)

func HashPassword(password string) (string, error) {
	salt := make([]byte, 16)
	if _, err := rand.Read(salt); err != nil {
		return "", err
	}
	hash := argon2.IDKey([]byte(password), salt, argonTime, argonMemory, argonThreads, argonKeyLen)
	return fmt.Sprintf("argon2id:v=19:m=%d,t=%d,p=%d:%s:%s", argonMemory, argonTime, argonThreads, base64.RawStdEncoding.EncodeToString(salt), base64.RawStdEncoding.EncodeToString(hash)), nil
}

func VerifyPassword(password string, encoded string) bool {
	if strings.HasPrefix(encoded, "sha256:") {
		return verifyLegacyPassword(password, encoded)
	}
	parts := strings.Split(encoded, ":")
	if len(parts) != 5 || parts[0] != "argon2id" || parts[1] != "v=19" || parts[2] != "m=65536,t=1,p=4" {
		return false
	}
	salt, err := base64.RawStdEncoding.DecodeString(parts[3])
	if err != nil {
		return false
	}
	expected, err := base64.RawStdEncoding.DecodeString(parts[4])
	if err != nil || len(expected) != int(argonKeyLen) {
		return false
	}
	actual := argon2.IDKey([]byte(password), salt, argonTime, argonMemory, argonThreads, argonKeyLen)
	return subtle.ConstantTimeCompare(actual, expected) == 1
}

func verifyLegacyPassword(password string, encoded string) bool {
	parts := strings.Split(encoded, ":")
	if len(parts) != 4 || parts[0] != "sha256" {
		return false
	}
	iterations, err := strconv.Atoi(parts[1])
	if err != nil || iterations < 1 {
		return false
	}
	salt, err := base64.RawStdEncoding.DecodeString(parts[2])
	if err != nil {
		return false
	}
	expected, err := base64.RawStdEncoding.DecodeString(parts[3])
	if err != nil {
		return false
	}
	actual := stretch(password, salt, iterations)
	return subtle.ConstantTimeCompare(actual, expected) == 1
}

func stretch(password string, salt []byte, iterations int) []byte {
	payload := append([]byte(password), salt...)
	sum := sha256.Sum256(payload)
	for i := 1; i < iterations; i++ {
		next := sha256.Sum256(sum[:])
		sum = next
	}
	return sum[:]
}
