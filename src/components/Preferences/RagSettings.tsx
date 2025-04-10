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
          onChange={(nextValue) =>
            setSettings({ ...settings, embeddingProvider: nextValue as EmbeddingProviderType })
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
        <FormLabel>Embedding Batch Size {settings.embeddingBatchSize} Chunks</FormLabel>
        <Slider
          value={settings.embeddingBatchSize}
          onChange={(value) => setSettings({ ...settings, embeddingBatchSize: value })}
          min={20}
          max={80}
          step={20}
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
