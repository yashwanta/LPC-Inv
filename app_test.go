package main

import (
	"regexp"
	"testing"
)

func TestNewOneTimeCode(t *testing.T) {
	code, err := newOneTimeCode()
	if err != nil {
		t.Fatalf("newOneTimeCode: %v", err)
	}
	if !regexp.MustCompile(`^\d{6}$`).MatchString(code) {
		t.Fatalf("code %q is not six digits", code)
	}
}

func TestMaskEmail(t *testing.T) {
	tests := map[string]string{
		"admin@example.com": "a****@example.com",
		"a@example.com":     "a***@example.com",
		"invalid":           "configured email",
	}
	for input, want := range tests {
		if got := maskEmail(input); got != want {
			t.Errorf("maskEmail(%q) = %q, want %q", input, got, want)
		}
	}
}
