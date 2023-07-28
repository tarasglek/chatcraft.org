import { Box, useColorMode } from "@chakra-ui/react";
import CodeMirror from "@uiw/react-codemirror";
import { javascript } from "@codemirror/lang-javascript";
import CodeHeader from "../components/CodeHeader";

type FunctionEditorProps = {
  value: string;
  onChange: (value: string) => void;
  filename?: string;
};

export default function FunctionEditor({ value, onChange, filename }: FunctionEditorProps) {
  const { colorMode } = useColorMode();

  return (
    <Box
      border="1px"
      borderRadius="5px"
      borderColor="gray.200"
      bg="gray.50"
      _dark={{
        bg: "gray.800",
        borderColor: "gray.600",
      }}
      pb={1}
    >
      <CodeHeader
        language="javascript"
        code={value}
        codeDownloadFilename={filename}
        isLoading={false}
      >
        <CodeMirror
          value={value}
          extensions={[javascript()]}
          theme={colorMode}
          height="100%"
          style={{
            height: "100%",
            marginTop: "-8px",
          }}
          onChange={onChange}
        />
      </CodeHeader>
    </Box>
  );
}
