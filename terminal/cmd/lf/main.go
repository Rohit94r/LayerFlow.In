package main

import (
	"fmt"
	"os"
)

var version = "dev"
var commit = "none"
var date = "unknown"

func main() {
	SetVersionInfo(version, commit, date)
	if err := Execute(); err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
}
