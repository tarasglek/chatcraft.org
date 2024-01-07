#!/bin/bash
set -e
# Source the ssh-to-age.sh library script
SCRIPT_DIR=$(dirname "$0")
source "$SCRIPT_DIR/lib/ssh-to-age.sh"

# Check if two arguments are provided
if [ "$#" -ne 3 ]; then
    echo "Usage: $0 'allowed_user1,allowed_user2' /path/to/authorized_keys /path/to/.sops.yaml"
    exit 1
fi

# Get the SOPS_USERS string from the first argument and split into an array
IFS=',' read -r -a SOPS_USERS <<< "$1"

# Get the authorized_keys file path from the second argument
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
SOPS_FILE="$3"

# Write the header for the .sops.yaml file with key_groups and age subsections
echo "creation_rules:" > "$SOPS_FILE"
echo "  - key_groups:" >> "$SOPS_FILE"
echo "      - age:" >> "$SOPS_FILE"

# Debug: Print the contents of SOPS_USERS
echo "Allowed SOPS users:"
printf "'%s'\n" "${SOPS_USERS[@]}"

# Function to check if an element is in the array
elementInArray() {
    local element
    for element in "${@:2}"; do
        [[ "$element" == "$1" ]] && return 0
    done
    return 1
}

# Array to keep track of found users
FOUND_USERS=()

# Read the authorized_keys file and convert each SSH key to an age key
while IFS= read -r line; do
    # Skip empty lines
    if [ -z "$line" ]; then
        continue
    fi

    # Extract the SSH key and the key ID (comment)
    ssh_key=$(echo "$line" | awk '{print $1 " " $2}')
    key_id=$(echo "$line" | awk '{print $3}')

    # Check if the key_id is in the SOPS_USERS array
    if elementInArray "$key_id" "${SOPS_USERS[@]}"; then
        # Add the key_id to the FOUND_USERS array
        FOUND_USERS+=("$key_id")

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
        echo "Adding key ID '$key_id' to $SOPS_FILE"
        echo "          - $age_key" >> "$SOPS_FILE"
    else
        echo "Warning: Key ID '$key_id' is not listed in the allowed users and will not be added."
    fi
done < "$AUTHORIZED_KEYS_PATH"

# Check for allowed users not found in the authorized_keys file
for user in "${SOPS_USERS[@]}"; do
    if ! elementInArray "$user" "${FOUND_USERS[@]}"; then
        echo "Warning: SOPS user '$user' not present in authorized_keys file."
    fi
done

echo "Generated $SOPS_FILE"