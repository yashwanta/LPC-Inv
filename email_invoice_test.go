package main

import (
	"bytes"
	"encoding/base64"
	"io"
	"mime"
	"mime/multipart"
	"net/mail"
	"strings"
	"testing"
)

func TestInvoiceEmailAttachment(t *testing.T) {
	var message bytes.Buffer
	pdf := []byte("%PDF-1.4\nPAYMENT INFORMATION\nCash or check only.")
	if err := writeMailBody(&message, "Make all checks payable to Yashwanta Thakur.", []mailAttachment{{Name: "invoice.pdf", Data: pdf}}); err != nil {
		t.Fatal(err)
	}
	parsed, err := mail.ReadMessage(&message)
	if err != nil {
		t.Fatal(err)
	}
	kind, params, err := mime.ParseMediaType(parsed.Header.Get("Content-Type"))
	if err != nil || kind != "multipart/mixed" {
		t.Fatalf("invalid MIME: %s %v", kind, err)
	}
	reader := multipart.NewReader(parsed.Body, params["boundary"])
	body, err := reader.NextPart()
	if err != nil {
		t.Fatal(err)
	}
	text, _ := io.ReadAll(body)
	if !strings.Contains(string(text), "Yashwanta Thakur") {
		t.Fatal("missing payment message")
	}
	attachment, err := reader.NextPart()
	if err != nil {
		t.Fatal(err)
	}
	if attachment.FileName() != "invoice.pdf" {
		t.Fatal("missing PDF filename")
	}
	decoded, err := io.ReadAll(base64.NewDecoder(base64.StdEncoding, attachment))
	if err != nil || !bytes.Equal(decoded, pdf) {
		t.Fatalf("attachment changed: %v", err)
	}
}
