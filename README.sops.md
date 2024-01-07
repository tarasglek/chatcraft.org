This repo uses sops to share secrets. This requires users to upload a ssh-ed25519 pubkey to github. And for their github username to get added to sops_users.txt

```bash
# install prereqs
go install github.com/getsops/sops/v3/cmd/sops@v3.8.1
go install github.com/Mic92/ssh-to-age/cmd/ssh-to-age@latest
```

### encryption

```bash
# fetch pub keys for all users in repo, ensure they ssh-ed25519
# this script will complain if user doesn't have a key or if it's not ssh-ed25519
./scripts/fetchkeys.sh /tmp/authorized_keys
# generate REPO_ROOT/.sops.yaml with keys that match users defined in sops_users.txt
# this ensures random contributors don't get access to keys until we trust em
./scripts/gensops.sh sops_users.txt $TMPDIR/authorized_keys
# at this point sops -e will be able to encrypt any yaml file for all recipients who have ssh-ed25519 keys uploaded to github and have been added to sops_users.txt
```

### decryption

```bash
# convert your ssh private key to sops env var
SOPS_AGE_KEY=`scripts/sops_age_key.sh

# edit secrets as you like
sops -i keys.enc.yaml

# or just decrypt em
sops -d keys.enc.yaml
```
