import { fetchHealth } from "../api";
import { useState } from "react";

export default function Home() {
  const [health, setHealth] = useState("");

  function handleClick() {
    fetchHealth().then((health) => {
      setHealth({ message: health.message });
    });
  }

  return (
    <div>
      <h1>Home Page</h1>
      <p>This is the home page content.</p>
      <button onClick={() => handleClick()}>Check Health</button>
      <p>{health.message}</p>
      <p>CI/CD TEST</p>
    </div>
  );
}
