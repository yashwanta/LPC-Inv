package security

import (
	"crypto/rand"
	"encoding/base64"
)

func NewSessionToken() string {
	token := make([]byte, 32)
	if _, err := rand.Read(token); err != nil {
		return ""
	}
	return base64.RawURLEncoding.EncodeToString(token)
}
