### Decryption

```bash
export SOPS_AGE_KEY=$(bash ./scripts/sops_age_key.sh)

sops -d sops/keys.enc.yaml
```

```bash
export SOPS_AGE_KEY=$(ssh-to-age -private-key < ~/.ssh/id_ed25519)
sops -i keys.enc.yaml
```

### Encryption

To add/remove users from repo do something like:

```bash
github-to-sops  --github-users `sops --output-type json --extract '["users_unencrypted"]' -d admin/users.sops-protected.yaml | jq -r 'join(",")'` --inplace-edit .sops.yaml
sops updatekeys keys.enc.yaml
```

Using sops -extract adds extra validation to make sure one of the admins signed that list and it hasn't been tampered with.
