import { TitleBar } from "./components/window/TitleBar";

function App() {
  return (
    <div className="app-root">
      <TitleBar />
      <div className="app-body">
        <div className="splash">
          <div className="wordmark">Lexora</div>
          <p className="subtitle">Premium vocabulary learning platform</p>
        </div>
      </div>
    </div>
  );
}

export default App;
