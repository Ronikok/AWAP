import { fetchApiHealth } from "../api";
import { fetchDbHealth } from "../api";
import { useState } from "react";

export default function Test() {
  const [apiHealth, setApiHealth] = useState("");
  const [dbHealth, setDbHealth] = useState("");

  async function handleClick() {
    try {
      const health = await fetchApiHealth();
      setApiHealth(health.message || health.status);
    } catch (error) {
      setApiHealth(`Error: ${error.message}`);
    }
  }

  async function handleDBClick() {
    try {
      const health = await fetchDbHealth();
      setDbHealth(health.message || health.status);
    } catch (error) {
      setDbHealth(`Error: ${error.message}`);
    }
  }

  return (
    <div>
      <h1>Test Page</h1>
      <button onClick={() => handleClick()}>Check API Health</button>
    <p>{apiHealth}</p>

      <button onClick={() => handleDBClick()}>Check DB Health</button>
    <p>{dbHealth}</p>
    </div>
  );
}
