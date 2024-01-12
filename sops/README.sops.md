To add/remove users from repo do something like:

```bash
github-to-sops  --github-users `sops --output-type json --extract '["users_unencrypted"]' -d admin/users.sops-protected.yaml | jq -r 'join(",")'` --inplace-edit .sops.yaml
sops updatekeys keys.enc.yaml
```

Using sops -extract adds extra validation to make sure one of the admins signed that list and it hasn't been tampered with.
