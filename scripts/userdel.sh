#!/bin/bash

# Get the directory of the current script
SCRIPT_DIR=$(dirname "$0")

# Source the GitHub library file from the same directory as the script
source "$SCRIPT_DIR/lib/github.sh"

# The username to remove as a collaborator
USERNAME_TO_REMOVE="$1"

# Optional repository URL (owner/repo format)
REPO_URL="${2:-}"

# Use the functions from the library
AUTH_HEADER=$(setup_github_api_auth_header)
API_URL=$(get_api_url "$REPO_URL")

# Check if the username to remove is provided
if [ -z "$USERNAME_TO_REMOVE" ]; then
    echo "Error: No username specified to remove from the repository."
    exit 1
fi

# Check if the API URL was determined successfully
if [ -z "$API_URL" ]; then
    echo "Error: Unable to determine the GitHub API URL."
    exit 1
fi

# Construct the URL to remove a collaborator from the repository
REMOVE_COLLABORATOR_URL="https://$API_URL/collaborators/$USERNAME_TO_REMOVE"

# Use curl to remove the user as a collaborator
response=$(curl -s -X DELETE -H "$AUTH_HEADER" "$REMOVE_COLLABORATOR_URL")

# Check the response
if [ -z "$response" ]; then
    echo "User '$USERNAME_TO_REMOVE' has been removed from the repository."
else
    echo "Failed to remove user '$USERNAME_TO_REMOVE' from the repository."
    echo "Response: $response"
fi