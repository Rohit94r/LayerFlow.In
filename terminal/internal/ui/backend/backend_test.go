package backend

import (
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func writeTemp(t *testing.T, content string) string {
	t.Helper()
	dir := t.TempDir()
	p := filepath.Join(dir, "notes.txt")
	if err := os.WriteFile(p, []byte(content), 0o644); err != nil {
		t.Fatal(err)
	}
	return dir
}

func TestExecuteToolWrite(t *testing.T) {
	dir := t.TempDir()
	res := writeTool(dir, `{"file_path": "out.txt", "content": "hello world"}`)
	if !strings.Contains(res, "out.txt") {
		t.Fatalf("unexpected result: %s", res)
	}
	data, err := os.ReadFile(filepath.Join(dir, "out.txt"))
	if err != nil {
		t.Fatal(err)
	}
	if string(data) != "hello world" {
		t.Fatalf("unexpected content: %q", data)
	}
}

func TestExecuteToolEditStrReplace(t *testing.T) {
	dir := writeTemp(t, "one\ntwo\nthree")
	res := editTool(dir, `{"command": "str_replace", "file_path": "notes.txt", "old_string": "two", "new_string": "TWO"}`)
	if !strings.Contains(res, "updated") {
		t.Fatalf("unexpected result: %s", res)
	}
	data, _ := os.ReadFile(filepath.Join(dir, "notes.txt"))
	if string(data) != "one\nTWO\nthree" {
		t.Fatalf("unexpected content: %q", data)
	}
}

func TestExecuteToolEditAmbiguous(t *testing.T) {
	dir := writeTemp(t, "x\ny\nx")
	res := editTool(dir, `{"command": "str_replace", "file_path": "notes.txt", "old_string": "x", "new_string": "z"}`)
	if !strings.Contains(res, "matches 2 times") {
		t.Fatalf("expected ambiguity error, got: %s", res)
	}
}

func TestExecuteToolEditInsert(t *testing.T) {
	dir := writeTemp(t, "a\nc")
	res := editTool(dir, `{"command": "insert", "file_path": "notes.txt", "insert_line": 1, "new_string": "b"}`)
	if !strings.Contains(res, "updated") {
		t.Fatalf("unexpected result: %s", res)
	}
	data, _ := os.ReadFile(filepath.Join(dir, "notes.txt"))
	if string(data) != "a\nb\nc" {
		t.Fatalf("unexpected content: %q", data)
	}
}
