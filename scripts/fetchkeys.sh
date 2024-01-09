#!/bin/bash

# Get the directory of the current script
SCRIPT_DIR=$(dirname "$0")

# Source the GitHub library file relative to the script directory
source "$SCRIPT_DIR/lib/github.sh"

# Use the functions from the library
AUTH_HEADER=$(setup_github_api_auth_header)

# Define the authorized_keys file path in the temporary directory
AUTHORIZED_KEYS_FILE=$1

# Check if AUTHORIZED_KEYS_FILE is set and not empty
if [ -z "$AUTHORIZED_KEYS_FILE" ]; then
    echo "Error: The path to the authorized_keys file must be provided as the first argument."
    exit 1
fi

# Erase the authorized_keys file when the script starts running
> "$AUTHORIZED_KEYS_FILE"

API_URL=$(get_api_url "$2")

# Append "/contributors" to the API URL to get the contributors endpoint
CONTRIBUTORS_URL="https://$API_URL/contributors"

echo "Fetching list of contributors from $CONTRIBUTORS_URL..."

# Use curl with -L to follow redirects and fetch the list of contributors from GitHub
contributors=$(curl -s -L -H "$AUTH_HEADER" $CONTRIBUTORS_URL | jq -r '.[].login')

# Check if contributors were fetched successfully
if [ -z "$contributors" ]; then
    echo "No contributors found or error fetching contributors."
    exit 1
fi

echo "Found contributors: $contributors"

# Message template for users with no keys or non-ed25519 keys
key_message_template="User %s does not have %s keys. Please create ssh-ed25519 keys using 'ssh-keygen -t ed25519 -C \"your_email@example.com\"', follow the instructions on https://docs.github.com/en/authentication/connecting-to-github-with-ssh/generating-a-new-ssh-key-and-adding-it-to-the-ssh-agent"

# Loop through each username and fetch their SSH public keys
for username in $contributors; do
    echo "Fetching SSH keys for $username..."
    # Fetch the SSH public keys for the user with -L
    keys=$(curl -s -L -H "$AUTH_HEADER" "https://github.com/$username.keys")
    if [ -z "$keys" ]; then
        printf "$key_message_template\n" "$username" "any"
    else
        # Check if the keys are of type ssh-ed25519
        ed25519_keys=$(echo "$keys" | grep 'ssh-ed25519')
        if [ -z "$ed25519_keys" ]; then
            printf "$key_message_template\n" "$username" "ssh-ed25519"
        else
            # Append the keys to the authorized_keys file with a comment for the username
            echo "$ed25519_keys" | while read -r key; do
                echo "$key $username" >> "$AUTHORIZED_KEYS_FILE"
            done
            echo "SSH ed25519 keys for $username appended to $AUTHORIZED_KEYS_FILE."
        fi
    fi
done

echo "All SSH ed25519 public keys have been fetched and stored in '$AUTHORIZED_KEYS_FILE'."