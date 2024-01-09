#!/bin/bash

# Source the GitHub library file
source lib/github.sh

# Use the functions from the library
AUTH_HEADER=$(setup_github_api_auth_header)
API_URL=$(get_api_url "$1")

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

# Temporary file to store commit dates
temp_file=$(mktemp)

# Loop through each username and fetch their last commit date
for username in $contributors; do
    echo "Checking last commit for $username..."
    # Fetch the last commit for the user with authentication if available
    last_commit_url="https://$API_URL/commits?author=$username"
    last_commit=$(curl -s -L -H "$AUTH_HEADER" "$last_commit_url" | jq -r '.[0].commit.author.date // "never"')

    # Write the username and last commit date to the temporary file
    echo "$username $last_commit" >> "$temp_file"
done

# Sort the temporary file by commit date, with "never" at the end
sort -k 2 -r "$temp_file" | while read -r line; do
    username=$(echo "$line" | awk '{print $1}')
    last_commit=$(echo "$line" | awk '{print $2}')
    if [ "$last_commit" == "never" ]; then
        echo "User $username has never committed to the repository."
    else
        echo "User $username last committed on $last_commit."
    fi
done

# Remove the temporary file
rm "$temp_file"