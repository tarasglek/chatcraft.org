# lib/github.sh

# Function to extract the GitHub API URL from the Git repository URL
get_api_url_from_git() {
    local git_url=$(git config --get remote.origin.url)
    if [[ $git_url == https://github.com/* ]]; then
        echo $git_url | sed 's/github.com/api.github.com\/repos/'
    elif [[ $git_url == git@github.com:* ]]; then
        echo $git_url | sed 's/git@github.com:/api.github.com\/repos\//' | sed 's/.git$//'
    else
        echo "Error: Unsupported or missing Git repository URL." >&2
        return 1
    fi
}

# Function to set up authentication header for GitHub API
setup_github_api_auth_header() {
    if [ -n "$GITHUB_TOKEN" ]; then
        echo "Authorization: token $GITHUB_TOKEN"
    else
        echo "No GitHub personal access token available. Unauthenticated requests are subject to lower rate limits." >&2
        echo ""
    fi
}

# Function to get the API URL with the provided URL or the URL of the current Git repository
get_api_url() {
    local repo_url="$1"
    local api_url=""
    if [ -z "$repo_url" ]; then
        echo "No repository URL provided. Attempting to use the current Git repository URL..." >&2
        api_url=$(get_api_url_from_git)
        if [ -z "$api_url" ]; then
            echo "Error: Unable to determine the repository URL from the current Git repository." >&2
            return 1
        fi
    else
        echo "Using provided repository URL: $repo_url" >&2
        api_url=$(echo $repo_url | sed 's/github.com/api.github.com\/repos/')
    fi
    echo "$api_url"
}