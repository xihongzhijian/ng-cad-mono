# Usage

<p align="right">(<a href="/README.md">back to home</a>)</p>



```ts
import {CadData, CadLine, CadViewer} from "@lucilor/cad-viewer";

const line = new CadLine();
line.start.set(0, 0);
line.end.set(100, 100);
const data = new CadData();
data.entities.add(line);

const viewer = new CadViewer(data, {width: innerWidth, height: innerHeight});
viewer.appendTo(document.body);
await viewer.render();
viewer.center();
```

You can also create a `CadData` like this:

```ts
const json = new CadData().export();
const data = new CadData(json);
```

<p align="right">(<a href="/README.md">back to home</a>)</p>
