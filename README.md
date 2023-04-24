This open source GPT UI is meant to be a combination of chatgpt and coding REPLs. Idea is to foster creativity by enabling better exploratory programming, learning, etc. Try it out at https://chatcraft.org

<img width="735" alt="image" src="https://user-images.githubusercontent.com/857083/234095992-ff2c7ad5-9318-4a17-98d3-d19f8d79e635.png">

Features:
* previews of HTML and mermaid diagrams.
* Deletion of messages, single-message mode. easy switching between chatgpt3.5/gpt-4 model to make it easier to coax desired responses
* fully-clientside UI, openai key storage, message history. This enables for easier exploration of various concepts, adding features for particular modes of interaction, etc without having to worry about serverside
* vite builds, for super-fast iteration
* Good chunk of the initial code was written using the tool itself ;)


Desired features:
* sidebar for switching llm params
* cancelling of streaming messages ala chatgpt
* New modes of interaction, eg integration with jsfiddle-like workflows, JS/TS REPL
* Social features: eg I should be able to write a blog post about obscure topic like "LLM-assisted formal methods for program checking" and link to a sample convo from my blog. users could jump in and start exploring that space. 
* Editing responses from GPT, to get better followup responses for when gpt is almost correct
* more LLM models, easier ways to adjust LLM settings
* voice? phone? chatgpt-plugins?

