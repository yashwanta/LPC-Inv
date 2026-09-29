package pdf

import (
	"simpletech-books/internal/repository"
	"strings"
	"testing"
)

func TestPaymentInformationOnLongInvoice(t *testing.T) {
	invoice := &repository.InvoiceDetail{BusinessName: "Lexington PC Clinic", PaymentInstructions: "Cash or check only.", CheckPayableTo: "Yashwanta Thakur"}
	for i := 0; i < 80; i++ {
		invoice.Items = append(invoice.Items, repository.InvoiceItem{ItemType: "labor", Description: "Computer repair", Quantity: 1, UnitPrice: 10, LineTotal: 10})
	}
	document := buildInvoiceText(invoice, &repository.AppSettings{BusinessName: "Other business"})
	for _, text := range []string{"Lexington PC Clinic", "Service Charge", "PAYMENT INFORMATION", "Cash or check only.", "Make all checks payable to Yashwanta Thakur."} {
		if !strings.Contains(document, text) {
			t.Errorf("missing %q", text)
		}
	}
	if strings.Contains(document, "Other business") {
		t.Fatal("wrong business heading")
	}
	if strings.Count(document, "/Type /Page ") < 2 {
		t.Fatal("long invoice must paginate")
	}
	other := buildInvoiceText(&repository.InvoiceDetail{BusinessName: "Other business"}, &repository.AppSettings{})
	if strings.Contains(other, "Yashwanta") || strings.Contains(other, "Cash or check") {
		t.Fatal("payment instructions leaked between businesses")
	}
}
