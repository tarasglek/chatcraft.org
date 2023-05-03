type HtmlPreviewProps = {
  children: React.ReactNode & React.ReactNode[];
};

const HtmlPreview = ({ children }: HtmlPreviewProps) => {
  return <iframe className="htmlPreview" srcDoc={String(children)}></iframe>;
};

export default HtmlPreview;
