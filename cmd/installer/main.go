//go:build installer

package main

import (
	"embed"
	"errors"
	"fmt"
	"io/fs"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
)

//go:embed payload/SimpleTechBooks.exe
var payload embed.FS

const appName = "SimpleTech Books"
const exeName = "SimpleTechBooks.exe"

func main() {
	fmt.Println("SimpleTech Books Setup")
	fmt.Println("======================")
	fmt.Println()

	installDevTools := hasArg("--dev")
	if err := installApp(); err != nil {
		fatal(err)
	}

	fmt.Println()
	fmt.Println("Checking runtime dependencies...")
	installRuntimeDependencies()

	if installDevTools {
		fmt.Println()
		fmt.Println("Installing developer tools...")
		installDeveloperTools()
	}

	fmt.Println()
	fmt.Println("Setup finished.")
	fmt.Println("Open SimpleTech Books from the Start Menu or run:")
	fmt.Printf("  %s\n", installedExePath())
	fmt.Println()
	fmt.Println("Note: PostgreSQL may ask you to finish its setup the first time it is installed.")
	pauseIfDoubleClicked()
}

func installApp() error {
	targetDir := installDir()
	if err := os.MkdirAll(targetDir, 0755); err != nil {
		return err
	}

	data, err := fs.ReadFile(payload, "payload/"+exeName)
	if err != nil {
		return fmt.Errorf("installer payload is missing %s: %w", exeName, err)
	}

	targetExe := installedExePath()
	if err := os.WriteFile(targetExe, data, 0755); err != nil {
		return err
	}
	fmt.Printf("Installed app: %s\n", targetExe)
	return createStartMenuLauncher(targetExe)
}

func installRuntimeDependencies() {
	if _, err := exec.LookPath("winget"); err != nil {
		fmt.Println("winget was not found. Install WebView2 Runtime and PostgreSQL manually if they are missing.")
		return
	}

	installWingetPackage("Microsoft.EdgeWebView2Runtime", "Microsoft Edge WebView2 Runtime")
	installWingetPackage("PostgreSQL.PostgreSQL", "PostgreSQL")
}

func installDeveloperTools() {
	if _, err := exec.LookPath("winget"); err != nil {
		fmt.Println("winget was not found. Install Git, Go, and Node manually.")
		return
	}

	installWingetPackage("Git.Git", "Git")
	installWingetPackage("GoLang.Go", "Go")
	installWingetPackage("OpenJS.NodeJS.LTS", "Node.js LTS")

	if _, err := exec.LookPath("go"); err != nil {
		fmt.Println("Go is not on PATH yet. Open a new terminal after setup, then run:")
		fmt.Println("  go install github.com/wailsapp/wails/v2/cmd/wails@v2.12.0")
		return
	}
	run("go", "install", "github.com/wailsapp/wails/v2/cmd/wails@v2.12.0")
}

func installWingetPackage(id string, label string) {
	fmt.Printf("Checking/installing %s...\n", label)
	args := []string{"install", "--id", id, "--exact", "--silent", "--accept-package-agreements", "--accept-source-agreements"}
	if err := run("winget", args...); err != nil {
		fmt.Printf("  Could not install %s automatically: %v\n", label, err)
	}
}

func createStartMenuLauncher(targetExe string) error {
	programs := os.Getenv("APPDATA")
	if strings.TrimSpace(programs) == "" {
		return nil
	}
	launcherDir := filepath.Join(programs, "Microsoft", "Windows", "Start Menu", "Programs", appName)
	if err := os.MkdirAll(launcherDir, 0755); err != nil {
		return err
	}
	launcherPath := filepath.Join(launcherDir, appName+".cmd")
	content := "@echo off\r\nstart \"" + appName + "\" \"" + targetExe + "\"\r\n"
	if err := os.WriteFile(launcherPath, []byte(content), 0644); err != nil {
		return err
	}
	fmt.Printf("Created Start Menu launcher: %s\n", launcherPath)
	return nil
}

func installDir() string {
	base := os.Getenv("LOCALAPPDATA")
	if strings.TrimSpace(base) == "" {
		base = filepath.Join(os.Getenv("USERPROFILE"), "AppData", "Local")
	}
	return filepath.Join(base, appName)
}

func installedExePath() string {
	return filepath.Join(installDir(), exeName)
}

func run(name string, args ...string) error {
	cmd := exec.Command(name, args...)
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr
	cmd.Stdin = os.Stdin
	return cmd.Run()
}

func hasArg(value string) bool {
	for _, arg := range os.Args[1:] {
		if strings.EqualFold(arg, value) {
			return true
		}
	}
	return false
}

func pauseIfDoubleClicked() {
	if len(os.Args) > 1 && hasArg("--no-pause") {
		return
	}
	fmt.Println("Press Enter to close setup.")
	_, _ = fmt.Scanln()
}

func fatal(err error) {
	if err == nil || errors.Is(err, os.ErrClosed) {
		return
	}
	fmt.Printf("Setup failed: %v\n", err)
	pauseIfDoubleClicked()
	os.Exit(1)
}
