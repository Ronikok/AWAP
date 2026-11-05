import { fetchHealth } from "../api";
import { useState } from "react";

export default function Test() {
  const [health, setHealth] = useState("");

  function handleClick() {
    fetchHealth().then((health) => {
      setHealth({ message: health.message });
    });
  }

  return (
    <div>
      <h1>Test Page</h1>
      <button onClick={() => handleClick()}>Check Health</button>
      <p>{health.message}</p>
    </div>
  );
}
