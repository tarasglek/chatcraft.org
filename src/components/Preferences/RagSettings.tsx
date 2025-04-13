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
import { EmbeddingsProviderType, EMBEDDINGS_PROVIDER_CONFIG } from "../../lib/embeddings";

function RagSettings() {
  const { settings, setSettings } = useSettings();

  const currentProviderConfig = EMBEDDINGS_PROVIDER_CONFIG[settings.embeddingsProvider];

  const handleProviderChange = (value: string) => {
    const providerType = value as EmbeddingsProviderType;
    const providerConfig = EMBEDDINGS_PROVIDER_CONFIG[providerType];

    setSettings({
      ...settings,
      embeddingsProvider: providerType,
      embeddingsBatchSize: providerConfig.defaultBatchSize,
    });
  };

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
          value={settings.embeddingsProvider}
          onChange={handleProviderChange}
          isDisabled={!settings.autogenerateEmbeddings}
        >
          <Stack>
            <Radio value="openai">Use OpenAI (Requires API KEY!)</Radio>
            <Radio value="tensorflow">Generate In Browser (tensorflow.js)</Radio>
          </Stack>
        </RadioGroup>
      </FormControl>
      <FormControl>
        <FormLabel>Embedding Batch Size {settings.embeddingsBatchSize} Chunks</FormLabel>
        <Slider
          value={settings.embeddingsBatchSize}
          onChange={(value) => setSettings({ ...settings, embeddingsBatchSize: value })}
          min={currentProviderConfig.minBatchSize}
          max={currentProviderConfig.maxBatchSize}
          step={currentProviderConfig.minBatchSize}
          isDisabled={!settings.autogenerateEmbeddings}
        >
          <SliderTrack>
            <SliderFilledTrack />
          </SliderTrack>
          <SliderThumb />
        </Slider>
        <FormErrorMessage>
          Maximum batch size must be between {currentProviderConfig.minBatchSize} and{" "}
          {currentProviderConfig.maxBatchSize} chunks
        </FormErrorMessage>
      </FormControl>
    </VStack>
  );
}

export default RagSettings;
