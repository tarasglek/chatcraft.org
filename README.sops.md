### encryption

```bash
# fetch pub keys for all users in repo, ensure they ssh-ed25519
./scripts/fetchkeys.sh /tmp/authorized_keys
# generate REPO_ROOT/.sops.yaml with keys that match users defined in sops_users.txt
# this ensures random contributors don't get access to keys until we trust em
./scripts/gensops.sh sops_users.txt $TMPDIR/authorized_keys
# at this point sops -e will be able to encrypt any yaml file for all recipients who have ssh-ed25519 keys uploaded to github and have been added to sops_users.txt
```

### decryption

```
# convert your ssh private key to sops env var
SOPS_AGE_KEY=`scripts/sops_age_key.sh

# edit secrets as you like
sops -i keys.enc.yaml

# or just decrypt em
sops -d keys.enc.yaml
```