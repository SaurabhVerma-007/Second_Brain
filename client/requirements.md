## Packages
react-markdown | For rendering AI chat responses with markdown formatting
remark-gfm | For tables and GitHub-flavored markdown support in chat
react-dropzone | For a premium, interactive file drag-and-drop experience
clsx | Utility for constructing className strings conditionally
tailwind-merge | Utility to merge tailwind classes without style conflicts

## Notes
- API `/api/documents` expects `multipart/form-data` with a `file` field.
- The chat endpoint is stateless; the client maintains the message history visually.
- We use a customized layout with a sidebar for global navigation.
