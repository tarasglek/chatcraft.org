import {
  FormControl,
  FormLabel,
  Stack,
  Slider,
  SliderTrack,
  SliderFilledTrack,
  SliderThumb,
  FormErrorMessage,
  FormHelperText,
  Kbd,
  RadioGroup,
  Radio,
  Checkbox,
  Box,
  ModalBody,
  VStack,
} from "@chakra-ui/react";
import { isMac } from "../../lib/utils";
import { useSettings } from "../../hooks/use-settings";

function CustomizationSettings() {
  const { settings, setSettings } = useSettings();

  return (
    <ModalBody>
      <VStack gap={6} mt={3}>
        <FormControl>
          <FormLabel>
            When writing a prompt, press <Kbd>Enter</Kbd> to...
          </FormLabel>
          <RadioGroup
            value={settings.enterBehaviour}
            onChange={(nextValue) =>
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
          </RadioGroup>
        </FormControl>

        <FormControl>
          <Checkbox
            isChecked={settings.countTokens}
            onChange={(e) => setSettings({ ...settings, countTokens: e.target.checked })}
          >
            Track and Display Token Count and Cost
          </Checkbox>
        </FormControl>

        <FormControl as="fieldset">
          <FormLabel as="legend">Image Compression</FormLabel>
          <Stack>
            <Box px="6">
              <FormControl>
                <FormLabel>
                  Maximum file size after compression: {settings.maxCompressedFileSizeMB} (MB)
                </FormLabel>
                <Slider
                  id="max-compressed-file-size"
                  value={settings.maxCompressedFileSizeMB}
                  onChange={(value) => setSettings({ ...settings, maxCompressedFileSizeMB: value })}
                  min={1}
                  max={20}
                  step={1}
                >
                  <SliderTrack>
                    <SliderFilledTrack />
                  </SliderTrack>
                  <SliderThumb />
                </Slider>
                <FormErrorMessage>Maximum file size must be between 1 and 20 MB.</FormErrorMessage>
                <FormHelperText>
                  After compression, each attached image will be under your chosen maximum file size
                  (1-20 MB).
                </FormHelperText>
              </FormControl>
            </Box>
            <Box px="6">
              <FormControl>
                <FormLabel>Maximum image dimension: {settings.maxImageDimension} (px)</FormLabel>
                <Slider
                  id="max-image-dimension"
                  value={settings.maxImageDimension}
                  onChange={(value) => setSettings({ ...settings, maxImageDimension: value })}
                  min={16}
                  max={2048}
                  step={16}
                >
                  <SliderTrack>
                    <SliderFilledTrack />
                  </SliderTrack>
                  <SliderThumb />
                </Slider>
                <FormErrorMessage>
                  Maximum Image dimension must be between 16 and 2048
                </FormErrorMessage>
                <FormHelperText>
                  Your compressed image&apos;s maximum width or height will be within the dimension
                  you choose (16-2048 pixels).
                </FormHelperText>
              </FormControl>
            </Box>
            <Box px="6">
              <FormControl>
                <FormLabel>Compression factor: {settings.compressionFactor}</FormLabel>
                <Slider
                  id="compression-factor"
                  value={settings.compressionFactor}
                  onChange={(value) => setSettings({ ...settings, compressionFactor: value })}
                  min={0.1}
                  max={1}
                  step={0.1}
                >
                  <SliderTrack>
                    <SliderFilledTrack />
                  </SliderTrack>
                  <SliderThumb />
                </Slider>
                <FormErrorMessage>Compression factor must be between 0.1 and 1.0</FormErrorMessage>
                <FormHelperText>
                  Set the maximum file size based on the original size multiplied by the factor you
                  choose (0.1-1.0).
                </FormHelperText>
              </FormControl>
            </Box>
          </Stack>
        </FormControl>
      </VStack>
    </ModalBody>
  );
}

export default CustomizationSettings;
