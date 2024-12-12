import {
  Box,
  Button,
  Divider,
  Flex,
  FormControl,
  FormHelperText,
  FormLabel,
  Input,
  Link,
  VStack,
} from "@chakra-ui/react";
import { ChangeEvent, useCallback, useEffect, useRef, useState } from "react";
import { useAlert } from "../../hooks/use-alert";
import db from "../../lib/db";
import { download } from "../../lib/utils";

// https://dexie.org/docs/StorageManager
async function isStoragePersisted() {
  if (navigator.storage?.persisted) {
    return await navigator.storage.persisted();
  }

  return false;
}

function Database() {
  // Whether our db is being persisted
  const [isPersisted, setIsPersisted] = useState(false);
  const { info, error } = useAlert();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    isStoragePersisted()
      .then((value) => setIsPersisted(value))
      .catch(console.error);
  }, []);

  async function handlePersistClick() {
    if (navigator.storage?.persist) {
      await navigator.storage.persist();
      const persisted = await isStoragePersisted();
      setIsPersisted(persisted);
    }
  }

  const handleExportClick = useCallback(
    async function () {
      // Don't load this unless it's needed (150K)
      const { exportDB } = await import("dexie-export-import");
      const blob = await exportDB(db);
      download(blob, "chatcraft-db.json", "application/json");
      info({
        title: "Downloaded",
        message: "Message was downloaded as a file",
      });
    },
    [info]
  );

  const handleFileChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onloadend = () => {
          const blob = new Blob([new Uint8Array(reader.result as ArrayBuffer)]);
          // Don't load this unless it's needed (150K)
          import("dexie-export-import")
            .then(({ importDB }) => importDB(blob))
            .then(() => {
              info({
                title: "Database Import",
                message: "Database imported successfully. You may need to refresh.",
              });
            })
            .catch((err) => {
              console.warn("Error importing db", err);
              error({
                title: "Database Import",
                message: "Unable to import database. See Console for more details.",
              });
            });
        };
        reader.readAsArrayBuffer(file);
      }
    },
    [error, info]
  );

  const handleImportClick = useCallback(
    function () {
      if (inputRef.current) {
        inputRef.current.click();
      }
    },
    [inputRef]
  );

  return (
    <Box my={3}>
      <VStack gap={4}>
        <FormControl>
          <Flex width="100%" flexDirection="column" mb={2}>
            <Flex justify="space-between" align="center">
              <FormLabel>
                Offline database is {isPersisted ? "persisted" : "not persisted"}
              </FormLabel>
              <Button
                size="sm"
                onClick={() => handlePersistClick()}
                isDisabled={isPersisted}
                variant="outline"
              >
                Persist
              </Button>
            </Flex>
            <FormHelperText>
              Persisted databases use the{" "}
              <Link
                href="https://developer.mozilla.org/en-US/docs/Web/API/Storage_API"
                textDecoration="underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                Storage API
              </Link>{" "}
              and are retained by the browser as long as possible. See{" "}
              <Link
                href="https://dexie.org/docs/ExportImport/dexie-export-import"
                textDecoration="underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                docs
              </Link>{" "}
              for database export details.
            </FormHelperText>
          </Flex>
        </FormControl>

        <Divider />

        <FormControl>
          <Flex justify="space-between" align="center">
            <FormLabel>Export database to to JSON file</FormLabel>
            <Button size="sm" onClick={() => handleExportClick()}>
              Export
            </Button>
          </Flex>
        </FormControl>

        <Divider />

        <FormControl>
          <Flex justify="space-between" align="center">
            <FormLabel>Import database from JSON file</FormLabel>
            <Button size="sm" onClick={() => handleImportClick()}>
              Import
            </Button>
            <Input
              type="file"
              ref={inputRef}
              onChange={handleFileChange}
              style={{ display: "none" }}
            />
          </Flex>
        </FormControl>
      </VStack>
    </Box>
  );
}

export default Database;
