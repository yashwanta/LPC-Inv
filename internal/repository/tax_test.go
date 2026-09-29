package repository

import (
	"math"
	"testing"
)

func TestNormalizeTaxRate(t *testing.T) {
	tests := map[float64]float64{6: 0.06, 0.06: 0.06, 6.5: 0.065, 0: 0, -1: 0}
	for input, want := range tests {
		if got := normalizeTaxRate(input); math.Abs(got-want) > 1e-9 {
			t.Errorf("normalizeTaxRate(%v) = %v, want %v", input, got, want)
		}
	}
}

func TestKentuckyLaborRule(t *testing.T) {
	ky := &AppSettings{PartsTaxable: true, LaborTaxable: false, LaborTaxableWithParts: true}
	if laborIsTaxable(ky, false) {
		t.Error("labor-only repair must not be taxable in Kentucky")
	}
	if !laborIsTaxable(ky, true) {
		t.Error("labor installing taxable parts must be taxable in Kentucky")
	}
	off := &AppSettings{LaborTaxableWithParts: false}
	if laborIsTaxable(off, true) {
		t.Error("rule disabled: labor stays non-taxable")
	}
}

func TestTaxIncludedWalkInMath(t *testing.T) {
	// $150 labor installing a $165 SSD, customer pays $315 with 6% KY tax included.
	rate := 0.06
	gross := 315.0
	tax := roundMoney(gross * rate / (1 + rate))
	if tax != 17.83 {
		t.Fatalf("tax = %v, want 17.83", tax)
	}
	if net := roundMoney(gross - tax); net != 297.17 {
		t.Fatalf("net = %v, want 297.17", net)
	}
}
