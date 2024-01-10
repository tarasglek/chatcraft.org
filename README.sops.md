# Working with Secrets using sops

This repo uses [sops](https://github.com/getsops/sops) to share secrets. This requires users to upload a [ssh-ed25519 pubkey to GitHub](https://docs.github.com/en/authentication/connecting-to-github-with-ssh/generating-a-new-ssh-key-and-adding-it-to-the-ssh-agent) and for their GitHub username to get added to [sops/admin/users.sops-protected.yaml](./sops/admin/users.sops-protected.yaml).

## Install Dependencies

You need to have the command line tools [sops](https://github.com/getsops/sops) and [ssh-to-age](https://github.com/Mic92/ssh-to-age/blob/main/README.md). This can be done in a variety of ways, including using `go`:

```bash
# install prereqs
go install github.com/getsops/sops/v3/cmd/sops@v3.8.1
go install github.com/Mic92/ssh-to-age/cmd/ssh-to-age@latest
```

The remainder of these instructions assume you are running in a Unix environment.

## Admin: Adding a user

To add a new user to the project, ensure that they have an ssh-ed25519 pubkey uploaded to GitHub.

Add the user's GitHub username to [sops/admin/users.sops-protected.yaml](./sops/admin/users.sops-protected.yaml) so we can encrypt secrets for them:

```bash
# fetch pub keys for all users in repo, ensure they ssh-ed25519
# this script will complain if user doesn't have a key or if it's not ssh-ed25519
./scripts/fetchkeys.sh /tmp/authorized_keys
# generate REPO_ROOT/.sops.yaml with keys that match users defined in sops_users.txt
# this ensures random contributors don't get access to keys until we trust em
ALLOWED_USERS=$(sops -d  --extract '["users_unencrypted"]'  --output-type json sops/admin/users.sops-protected.yaml | jq -r 'join(",")')
./scripts/gensops.sh $ALLOWED_USERS /tmp/authorized_keys sops/.sops.yaml
# at this point sops -e will be able to encrypt any yaml file for all recipients who have ssh-ed25519 keys uploaded to github and have been added to sops_users.txt
```

Now we need to re-encrypt secrets for the new user

```bash
# convert your ssh private key to sops env var
SOPS_AGE_KEY=`scripts/sops_age_key.sh`

# update secrets, this will re-encrypt them for new user
(cd sops/ && sops updatekeys keys.enc.yaml)

# check with git diff that we encrypted for new user
git diff sops/keys.enc.yaml
```

### User: Decrypting secrets

```bash
export SOPS_AGE_KEY=scripts/sops_age_key.sh

sops -d sops/keys.enc.yaml
```

### Holes

To paraphrase sops docs: note that, while sops user list is in cleartext, unencrypted content is still added to the checksum of the file, and thus cannot be modified outside of SOPS without breaking the file integrity check.

It's up to git review to ensure that only users in sops/admin/.sops.yaml can add new users to sops/users.sops.yaml. From there on sops integrity checks help. In theory github action could verify this. In practice users can override github actions in their pull req.
