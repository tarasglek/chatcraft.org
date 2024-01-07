#!/bin/bash

# Source the ssh-to-age.sh library script
SCRIPT_DIR=$(dirname "$0")
source "$SCRIPT_DIR/lib/ssh-to-age.sh"

# Check if an argument is provided
if [ "$#" -ne 2 ]; then
    echo "Usage: $0 /path/to/sops_users /path/to/authorized_keys"
    exit 1
fi

SOPS_USERS_FILE="$1"

# Get the authorized_keys file path from the first argument
AUTHORIZED_KEYS_PATH="$2"

# Find the binary using the function from the library
BINARY_PATH=$(find_ssh_to_age_binary)
if [ $? -ne 0 ]; then
    exit 1
fi

# Find the root directory of the git repository using the function from the library
GIT_REPO_ROOT=$(find_git_repo_root)
if [ $? -ne 0 ]; then
    exit 1
fi

# Create the .sops.yaml file in the git repository root
SOPS_FILE="$GIT_REPO_ROOT/.sops.yaml"

# Write the header for the .sops.yaml file with key_groups and age subsections
echo "creation_rules:" > "$SOPS_FILE"
echo "  - key_groups:" >> "$SOPS_FILE"
echo "      - age:" >> "$SOPS_FILE"

# Read the sops_users.txt file into an array, ensuring the last line is read even without a newline
SOPS_USERS=()
while IFS= read -r user || [[ -n "$user" ]]; do
    SOPS_USERS+=("$user")
done < "$SOPS_USERS_FILE"

# Debug: Print the contents of SOPS_USERS
echo "Loaded SOPS_USERS:"
printf "'%s'\n" "${SOPS_USERS[@]}"

# Function to check if an element is in the array
elementInArray() {
    local element
    for element in "${@:2}"; do
        [[ "$element" == "$1" ]] && return 0
    done
    return 1
}

# Read the authorized_keys file and convert each SSH key to an age key
while IFS= read -r line; do
    # Skip empty lines
    if [ -z "$line" ]; then
        continue
    fi

    # Extract the SSH key and the key ID (comment)
    ssh_key=$(echo "$line" | awk '{print $1 " " $2}')
    key_id=$(echo "$line" | awk '{print $3}')

    # Debug: Print the key_id being checked
    echo "Checking key ID: '$key_id'"

    # Check if the key_id is in the sops_users.txt file
    if elementInArray "$key_id" "${SOPS_USERS[@]}"; then
        # Convert the SSH key to an age key by calling the binary directly
        age_key=$("$BINARY_PATH" -i <(echo "$ssh_key") 2>/dev/null)
        if [ -z "$age_key" ]; then
            echo "Error: Failed to convert SSH key to age key."
            continue
        fi

        # Append the key ID as a comment and the age key to the .sops.yaml file
        if [ -n "$key_id" ]; then
            echo "          # $key_id" >> "$SOPS_FILE"
        fi
        echo "          - $age_key" >> "$SOPS_FILE"
    else
        echo "Warning: Key ID '$key_id' is not listed in sops_users.txt and will not be added."
    fi
done < "$AUTHORIZED_KEYS_PATH"

echo "The .sops.yaml file has been created at the root of the git repository:"
echo "$SOPS_FILE"