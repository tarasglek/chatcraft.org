import {
  Checkbox,
  FormControl,
  FormErrorMessage,
  FormLabel,
  Radio,
  RadioGroup,
  Slider,
  SliderFilledTrack,
  SliderThumb,
  SliderTrack,
  Stack,
  VStack,
} from "@chakra-ui/react";
import { useSettings } from "../../hooks/use-settings";
import { EmbeddingProviderType } from "../../lib/embeddings";

function RagSettings() {
  const { settings, setSettings } = useSettings();

  return (
    <VStack gap={6} my={3}>
      <FormControl>
        <FormLabel>RAG - Autogeneration Preference</FormLabel>
        <Checkbox
          isChecked={settings.autogenerateEmbeddings}
          onChange={(e) => setSettings({ ...settings, autogenerateEmbeddings: e.target.checked })}
        >
          Autogenerate Chunks and Embeddings
        </Checkbox>
      </FormControl>
      <FormControl>
        <FormLabel>Embedding Strategy:</FormLabel>
        <RadioGroup
          value={settings.embeddingProvider}
          onChange={(value) =>
            setSettings({
              ...settings,
              embeddingProvider: value as EmbeddingProviderType,
              embeddingMaxBatchSize: value === "openai" ? 4000 : 256,
            })
          }
          isDisabled={!settings.autogenerateEmbeddings}
        >
          <Stack>
            <Radio value="openai">Open-AI (Requires API KEY!)</Radio>
            <Radio value="tensorflow">Tensorflow</Radio>
          </Stack>
        </RadioGroup>
      </FormControl>
      <FormControl>
        <FormLabel>Embedding Batch Size {settings.embeddingMaxBatchSize} Chunks</FormLabel>
        <Slider
          value={settings.embeddingMaxBatchSize}
          onChange={(value) => setSettings({ ...settings, embeddingMaxBatchSize: value })}
          min={settings.embeddingProvider === "openai" ? 500 : 16}
          max={settings.embeddingProvider === "openai" ? 4000 : 256}
          step={settings.embeddingMaxBatchSize > 256 ? 500 : 16}
          isDisabled={!settings.autogenerateEmbeddings}
        >
          <SliderTrack>
            <SliderFilledTrack />
          </SliderTrack>
          <SliderThumb />
        </Slider>
        <FormErrorMessage>Maximum batch size must be between 20 and 80 chunks</FormErrorMessage>
      </FormControl>
    </VStack>
  );
}

export default RagSettings;
