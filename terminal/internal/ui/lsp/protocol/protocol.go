package protocol

type Diagnostic struct {
	Range    Range
	Severity int
	Source   string
	Message  string
}

const (
	SeverityError       = 1
	SeverityWarning     = 2
	SeverityInformation = 3
	SeverityHint        = 4
)

type Range struct {
	Start Position
	End   Position
}

type Position struct {
	Line      int
	Character int
}
