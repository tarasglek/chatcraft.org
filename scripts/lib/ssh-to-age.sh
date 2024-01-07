#!/bin/bash

# Set GOPATH to the default location if it is not set
if [ -z "$GOPATH" ]; then
    export GOPATH="$HOME/go"
    export PATH="$PATH:$GOPATH/bin"
fi

# Function to find the git repository root
find_git_repo_root() {
    local script_dir=$(dirname "$(realpath "$0")")
    local git_repo_root=$(git -C "$script_dir" rev-parse --show-toplevel 2>/dev/null)
    if [ -z "$git_repo_root" ]; then
        echo "Error: Unable to find the root of the git repository." >&2
        return 1
    fi
    echo "$git_repo_root"
}

# Function to find the ssh-to-age binary
find_ssh_to_age_binary() {
    local binary_name="ssh-to-age"
    local binary_path=$(command -v "$binary_name")

    # Check if the binary exists and is executable
    if [ ! -x "$binary_path" ]; then
        echo "Error: $binary_name binary not found or not executable." >&2
        echo "Please install it using the following command:" >&2
        echo "  go install github.com/Mic92/ssh-to-age/cmd/ssh-to-age@latest" >&2
        return 1
    fi

    echo "$binary_path"
}

# Function to convert an SSH private key to an age private key
convert_ssh_private_key_to_age() {
    local binary_path="$1"
    local ssh_private_key_path="$2"

    # Check if the private SSH key file exists
    if [ ! -f "$ssh_private_key_path" ]; then
        echo "Error: SSH private key file not found at $ssh_private_key_path" >&2
        return 1
    fi

    # Run the ssh-to-age binary to get the age private key
    local age_private_key=$("$binary_path" -private-key -i "$ssh_private_key_path" 2>&1)

    # Check if the age private key was successfully obtained
    if [ -z "$age_private_key" ]; then
        echo "Error: Failed to obtain the age private key." >&2
        return 1
    fi

    echo "$age_private_key"
}