import { Fieldset, Stack, Kbd, Box, RadioGroup, VStack } from "@chakra-ui/react";
import { Field } from "../ui/field";
import { isMac } from "../../lib/utils";
import { Radio } from "../ui/radio";
import { Slider } from "../ui/slider";
import { Checkbox } from "../ui/checkbox";
import { useSettings } from "../../hooks/use-settings";

function CustomizationSettings() {
  const { settings, setSettings } = useSettings();

  return (
    <VStack gap={6} my={3}>
      <Fieldset.Root>
        <Field label={`When writing a prompt, press ${(<Kbd>Enter</Kbd>)} to...`} />
        <RadioGroup.Root
          defaultValue={settings.enterBehaviour}
          onValueChange={(nextValue: any) =>
            setSettings({ ...settings, enterBehaviour: nextValue as EnterBehaviour })
          }
        >
          <Stack>
            <Radio value="send">Send the message</Radio>
            <Radio value="newline">
              Start a new line (use {isMac() ? <Kbd>Command ⌘</Kbd> : <Kbd>Ctrl</Kbd>} +
              <Kbd>Enter</Kbd> to send)
            </Radio>
          </Stack>
        </RadioGroup.Root>
      </Fieldset.Root>

      <Field>
        <Checkbox
          checked={settings.countTokens}
          onCheckedChange={(e) => setSettings({ ...settings, countTokens: !!e.checked })}
        >
          Track and Display Token Count and Cost
        </Checkbox>
      </Field>

      <Fieldset.Root>
        <Fieldset.Legend>
          Maximum file size after compression: {settings.maxCompressedFileSizeMB} MB
        </Fieldset.Legend>
        <Stack>
          <Box px="6">
            <Field
              label={`Maximum file size after compression: ${settings.maxCompressedFileSizeMB} (MB)`}
              errorText="Maximum file size must be between 1 and 20 MB."
              helperText="After compression, each attached image will be under your chosen maximum file size
              (1-20 MB)."
            />
            <Slider
              id="max-compressed-file-size"
              defaultValue={[settings.maxCompressedFileSizeMB]}
              onValueChange={({ value }) => {
                const [newValue] = value;
                setSettings({ ...settings, maxCompressedFileSizeMB: newValue });
              }}
              min={1}
              max={20}
              thumbSize={{ width: 16, height: 16 }}
              step={1}
            />
          </Box>
          <Box px="6">
            <Field
              label={`Maximum image dimension: ${settings.maxImageDimension} px`}
              errorText="Maximum image dimension must be between 16 and 2048 px."
              helperText="Your compressed image's maximum width or height will be within the dimension you choose (16-2048 pixels)."
            >
              <Slider
                id="max-image-dimension"
                defaultValue={[settings.maxImageDimension]}
                onValueChange={({ value }) => {
                  const [newValue] = value;
                  setSettings({ ...settings, maxImageDimension: newValue });
                }}
                min={16}
                max={2048}
                step={16}
                thumbSize={{ width: 16, height: 16 }}
              />
            </Field>
          </Box>
          <Box px="6">
            <Field
              label={`Compression factor: ${settings.compressionFactor}`}
              errorText="Compression factor must be between 0.1 and 1.0."
              helperText="Set the maximum file size based on the original size multiplied by the factor you choose (0.1-1.0)."
            >
              <Slider
                id="compression-factor"
                defaultValue={[settings.compressionFactor]}
                onValueChange={({ value }) => {
                  const [newValue] = value;
                  setSettings({ ...settings, compressionFactor: newValue });
                }}
                min={0.1}
                max={1}
                thumbSize={{ width: 16, height: 16 }}
                step={0.1}
              />
            </Field>
          </Box>
        </Stack>
      </Fieldset.Root>
    </VStack>
  );
}

export default CustomizationSettings;
