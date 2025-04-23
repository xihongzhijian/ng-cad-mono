<a id="readme-top"></a>

- [Config](#config)
  - [`CadViewerConfig`](#cadviewerconfig)
  - [`CadViewerHotKey`](#cadviewerhotkey)
  - [Default hotkeys](#default-hotkeys)


# Config

<p align="right">(<a href="../README.md">back to home</a>)</p>



You can set cad viewer's configuration by:

```ts
// set config at the beginning
const viewer = new CadViewer({}, {width: innerWidth, height: innerHeight});

// set config afterwards
viewer.setConfig("backgroundColor", "red");
viewer.setConfig({width: innerWidth, height: innerHeight});
```

<p align="right">(<a href="#readme-top">back to top</a>)</p>

## `CadViewerConfig`

| Name                    | Default value | Description                                                                                           |
| ----------------------- | ------------- | ----------------------------------------------------------------------------------------------------- |
| **width**               | `300`         | Width of container.                                                                                   |
| **height**              | `150`         | Height of container.                                                                                  |
| **backgroundColor**     | `"black"`     | Background color of container. Same format as css color.                                              |
| **padding**             | `[0]`         | Padding of container when content is centered. Same format as css padding.                            |
| **reverseSimilarColor** | `true`        | Auto change entity color when it's color is similar to background color.                              |
| **selectMode**          | `"multiple"`  | Entity select mode. `"none"`, `"single"`, `"multiple"`                                                |
| **dragAxis**            | `"xy"`        | Specify the drag axis of the content. `""`, `"x"`, `"y"`, `"xy" `                                     |
| **entityDraggable**     | `true`        | Whether the entities is draggable. `["LINE", "ARC"]`: only `LINE` and `ARC` entities are draggable.   |
| **hideDimensions**      | `false`       | Whether to hide dimensions.                                                                           |
| **minLinewidth**        | `false`       | All lines' min width, increase it to make it easier to select.                                        |
| **fontStyle**           | `{}`          | Global font style. <!-- todo: add reference -->                                                       |
| **dimStyle**            | `{}`          | Global dimension style. <!-- todo: add reference -->                                                  |
| **enableZoom**          | `false`       | Whether to enable zoom.                                                                               |
| **dashedLinePadding**   | `2`           | Padding of dashed line. `2`: 2 at start and end; `[2, 4]`: 2 at start and 4 at end.                   |
| **hotKeys**             | ...           | Customize hotkeys. See [`CadViewerHotKey`](#cadviewerhotkey) and [Default hotkeys](#default-hotkeys). |
| **validateLines**       | `false`       | `@ignore`                                                                                             |
| **lineGongshi**         | `0`           | `@ignore`                                                                                             |
| **hideLineLength**      | `false`       | `@ignore`                                                                                             |
| **hideLineGongshi**     | `false`       | `@ignore`                                                                                             |

<p align="right">(<a href="#readme-top">back to top</a>)</p>

## `CadViewerHotKey`

| Name      | Required | Description            |
| --------- | -------- | ---------------------- |
| **key**   | Yes      | The key to be pressed. |
| **ctrl**  | No       | Ctrl combination.      |
| **alt**   | No       | Alt combination.       |
| **shift** | No       | Shift combination.     |

<p align="right">(<a href="#readme-top">back to top</a>)</p>

## Default hotkeys
| Name           | Hotkey                  | Action                    |
| -------------- | ----------------------- | ------------------------- |
| selectAll      | `Ctrl + A`              | Select all entities.      |
| unSelectAll    | `Esc`                   | Unselect all entities.    |
| copyEntities   | `Ctrl + C`              | Copy selected entities.   |
| pasteEntities  | `Ctrl + V` or `Enter`   | Paste copied entities.    |
| deleteEntities | `Delete` or `Backspace` | Delete selected entities. |

<p align="right">(<a href="#readme-top">back to top</a>)</p>
<p align="right">(<a href="../README.md">back to home</a>)</p>
