import {
  FormControl,
  FormLabel,
  FormHelperText,
  Input,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  RadioGroup,
  Radio,
  VStack,
  Stack,
  Select,
  Kbd,
} from "@chakra-ui/react";

import useSettings from "../hooks/use-settings";

type PreferencesModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

function PreferencesModal({ isOpen, onClose }: PreferencesModalProps) {
  const { settings, setSettings } = useSettings();

  const updateSettings = (setting: Partial<Settings>) => {
    setSettings({ ...settings, ...setting });
  };

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} size="lg">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>User Settings</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack gap={2}>
              <FormControl>
                <FormLabel>OpenAI API Key</FormLabel>
                <Input type="password" placeholder="TODO..." />
                <FormHelperText>Your API Key is stored in browser storage</FormHelperText>
              </FormControl>

              <FormControl>
                <FormLabel>GPT Model</FormLabel>
                <Select
                  value={settings.model}
                  onChange={(e) => updateSettings({ model: e.target.value as GptModel })}
                >
                  <option value="gpt-4">GPT-4</option>
                  <option value="gpt-3.5-turbo">ChatGPT (gpt-3.5-turbo)</option>
                </Select>
                <FormHelperText>NOTE: not all accounts have access to GPT-4</FormHelperText>
              </FormControl>

              <FormControl>
                <FormLabel>
                  When writing a prompt, press <Kbd>Enter</Kbd> to...
                </FormLabel>
                <RadioGroup
                  value={settings.enterBehaviour}
                  onChange={(nextValue) =>
                    updateSettings({ enterBehaviour: nextValue as EnterBehaviour })
                  }
                >
                  <Stack>
                    <Radio value="send">Send the message</Radio>
                    <Radio value="newline">
                      Start a new line (use <Kbd>⌘</Kbd>+<Kbd>Enter</Kbd> or <Kbd>Ctrl</Kbd>+
                      <Kbd>Enter</Kbd> to send)
                    </Radio>
                  </Stack>
                </RadioGroup>
              </FormControl>
            </VStack>
          </ModalBody>

          <ModalFooter></ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
}

export default PreferencesModal;
