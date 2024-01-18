### Decryption

There are 2 ways this can be done.

**1.** Using the [Project Script](../scripts/sops_age_key.sh)

```bash
export SOPS_AGE_KEY=$(bash ./scripts/sops_age_key.sh)
sops -d sops/keys.enc.yaml
```

**Note:** Instead of storing the private age key in the environment variable, it is recommended to store the secrets in a `keys.txt` file as documented at
https://github.com/getsops/sops/blob/0bceaf42b834f254cf2c6a6f61e7121de8eb9c52/README.rst#L205C1-L212C22

**2.** Using [ssh-to-age](https://github.com/Mic92/ssh-to-age) tool

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
