import { useState } from "react";

export function useCardMetadataDraft() {
  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [category, setCategory] = useState("");
  const [tagsText, setTagsText] = useState("");
  const [code, setCode] = useState("");

  return {
    category,
    code,
    setCategory,
    setCode,
    setSubtitle,
    setTagsText,
    setTitle,
    subtitle,
    tagsText,
    title,
  };
}
