package pdf

import (
	"bytes"
	"fmt"
	"os"
	"path/filepath"
	"strings"

	"simpletech-books/internal/repository"
)

func WriteInvoice(invoice *repository.InvoiceDetail, settings *repository.AppSettings) (string, error) {
	home, err := os.UserHomeDir()
	if err != nil {
		return "", err
	}
	dir := filepath.Join(home, "Documents", "SimpleTech Books", "Invoices")
	if err := os.MkdirAll(dir, 0755); err != nil {
		return "", err
	}
	path := filepath.Join(dir, invoice.InvoiceNumber+".pdf")
	body := buildInvoiceText(invoice, settings)
	if err := os.WriteFile(path, []byte(body), 0644); err != nil {
		return "", err
	}
	return path, nil
}

func buildInvoiceText(invoice *repository.InvoiceDetail, settings *repository.AppSettings) string {
	var lines []string
	name := invoice.BusinessName
	if name == "" {
		name = settings.BusinessName
	}
	lines = append(lines, name)
	if settings.BusinessAddress != "" {
		lines = append(lines, settings.BusinessAddress)
	}
	if settings.BusinessPhone != "" || settings.BusinessEmail != "" {
		lines = append(lines, strings.TrimSpace(settings.BusinessPhone+" "+settings.BusinessEmail))
	}
	lines = append(lines, "")
	lines = append(lines, "INVOICE "+invoice.InvoiceNumber)
	lines = append(lines, "Invoice date: "+invoice.InvoiceDate)
	lines = append(lines, "Due date: "+invoice.DueDate)
	lines = append(lines, "Status: "+strings.ToUpper(invoice.Status))
	lines = append(lines, "")
	lines = append(lines, "Bill To:")
	lines = append(lines, invoice.Customer.FullName)
	if invoice.Customer.CompanyName != "" {
		lines = append(lines, invoice.Customer.CompanyName)
	}
	if invoice.Customer.BillingAddress != "" {
		for _, line := range strings.Split(invoice.Customer.BillingAddress, "\n") {
			lines = append(lines, line)
		}
	}
	lines = append(lines, "")
	lines = append(lines, "Items")
	lines = append(lines, "Description                         Qty       Rate       Tax     Total")
	lines = append(lines, "-----------------------------------------------------------------------")
	for _, item := range invoice.Items {
		taxable := "No"
		if item.Taxable {
			taxable = "Yes"
		}
		kind := map[string]string{"labor": "Service Charge", "parts": "Parts", "other": "Other"}[item.ItemType]
		lines = append(lines, kind)
		lines = append(lines, fmt.Sprintf("%-32s %8.2f %10.2f %7s %10.2f", truncate(item.Description, 32), item.Quantity, item.UnitPrice, taxable, item.LineTotal))
	}
	lines = append(lines, "")
	if invoice.TaxIncluded {
		lines = append(lines, fmt.Sprintf("Before tax:      $%10.2f", invoice.Subtotal))
		lines = append(lines, fmt.Sprintf("KY sales tax (included): $%.2f", invoice.TaxAmount))
	} else {
		lines = append(lines, fmt.Sprintf("Subtotal:        $%10.2f", invoice.Subtotal))
		lines = append(lines, fmt.Sprintf("Discount:        $%10.2f", invoice.DiscountAmount))
		lines = append(lines, fmt.Sprintf("Sales tax:       $%10.2f", invoice.TaxAmount))
	}
	lines = append(lines, fmt.Sprintf("Total:           $%10.2f", invoice.TotalAmount))
	lines = append(lines, fmt.Sprintf("Paid:            $%10.2f", invoice.PaidAmount))
	lines = append(lines, "")
	if invoice.PaymentInstructions != "" || invoice.CheckPayableTo != "" {
		lines = append(lines, "PAYMENT INFORMATION")
		if invoice.PaymentInstructions != "" {
			lines = append(lines, invoice.PaymentInstructions)
		}
		if invoice.CheckPayableTo != "" {
			lines = append(lines, "Make all checks payable to "+invoice.CheckPayableTo+".")
		}
		lines = append(lines, "")
	}
	if invoice.Notes != "" {
		lines = append(lines, "Notes: "+invoice.Notes)
	}
	if invoice.Terms != "" {
		lines = append(lines, "Terms: "+invoice.Terms)
	}
	return renderSimplePDF(lines)
}

func renderSimplePDF(lines []string) string {
	var wrapped []string
	for _, line := range lines {
		for _, paragraph := range strings.Split(strings.ReplaceAll(line, "\r", ""), "\n") {
			for len([]rune(paragraph)) > 78 {
				chars := []rune(paragraph)
				cut := 78
				for i := 78; i > 35; i-- {
					if chars[i] == ' ' {
						cut = i
						break
					}
				}
				wrapped = append(wrapped, string(chars[:cut]))
				paragraph = strings.TrimLeft(string(chars[cut:]), " ")
			}
			wrapped = append(wrapped, paragraph)
		}
	}
	const perPage = 49
	pages := (len(wrapped) + perPage - 1) / perPage
	if pages == 0 {
		pages = 1
	}
	objects := []string{"<< /Type /Catalog /Pages 2 0 R >>", "", "<< /Type /Font /Subtype /Type1 /BaseFont /Courier >>"}
	var kids []string
	for page := 0; page < pages; page++ {
		pageID := len(objects) + 1
		kids = append(kids, fmt.Sprintf("%d 0 R", pageID))
		var content bytes.Buffer
		content.WriteString("BT\n/F1 10 Tf\n50 750 Td\n14 TL\n")
		end := (page + 1) * perPage
		if end > len(wrapped) {
			end = len(wrapped)
		}
		for _, line := range wrapped[page*perPage : end] {
			content.WriteString("(" + escapePDF(line) + ") Tj\nT*\n")
		}
		content.WriteString("ET\n")
		objects = append(objects,
			fmt.Sprintf("<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 3 0 R >> >> /Contents %d 0 R >>", pageID+1),
			fmt.Sprintf("<< /Length %d >>\nstream\n%sendstream", content.Len(), content.String()))
	}
	objects[1] = fmt.Sprintf("<< /Type /Pages /Kids [%s] /Count %d >>", strings.Join(kids, " "), pages)

	var pdf bytes.Buffer
	pdf.WriteString("%PDF-1.4\n")
	offsets := make([]int, 0, len(objects)+1)
	offsets = append(offsets, 0)
	for i, object := range objects {
		offsets = append(offsets, pdf.Len())
		pdf.WriteString(fmt.Sprintf("%d 0 obj\n%s\nendobj\n", i+1, object))
	}
	xrefStart := pdf.Len()
	pdf.WriteString(fmt.Sprintf("xref\n0 %d\n", len(objects)+1))
	pdf.WriteString("0000000000 65535 f \n")
	for i := 1; i < len(offsets); i++ {
		pdf.WriteString(fmt.Sprintf("%010d 00000 n \n", offsets[i]))
	}
	pdf.WriteString(fmt.Sprintf("trailer\n<< /Size %d /Root 1 0 R >>\nstartxref\n%d\n%%%%EOF\n", len(objects)+1, xrefStart))
	return pdf.String()
}

func escapePDF(value string) string {
	value = strings.ReplaceAll(value, "\\", "\\\\")
	value = strings.ReplaceAll(value, "(", "\\(")
	value = strings.ReplaceAll(value, ")", "\\)")
	return value
}

func truncate(value string, max int) string {
	if len(value) <= max {
		return value
	}
	if max <= 3 {
		return value[:max]
	}
	return value[:max-3] + "..."
}
