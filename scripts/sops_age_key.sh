#!/bin/bash

# Source the library script
SCRIPT_DIR=$(dirname "$(realpath "$0")")
source "$SCRIPT_DIR/lib/ssh-to-age.sh"

# Define the path to your private SSH key
SSH_PRIVATE_KEY_PATH="$HOME/.ssh/id_ed25519"

# Find the ssh-to-age binary using the library function
BINARY_PATH=$(find_ssh_to_age_binary)
if [ $? -ne 0 ]; then
    exit 1
fi

# Convert the SSH private key to an age private key using the library function
AGE_PRIVATE_KEY=$(convert_ssh_private_key_to_age "$BINARY_PATH" "$SSH_PRIVATE_KEY_PATH")
if [ $? -ne 0 ]; then
    exit 1
fi

# Output the age private key
echo "$AGE_PRIVATE_KEY"