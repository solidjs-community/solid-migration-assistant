import { omit } from "solid-js";

function Column(rawProps: ColumnProps) {
  const props = rawProps;
  const sectionProps = omit(rawProps, "column", "cards");
  return <section {...sectionProps}>{props.column.title}: {props.cards.length}</section>;
}

function BoardView(props: BoardViewProps) {
  return <main>{props.visibleCards.map((card) => card.title)}</main>;
}

function Toolbar(props: ToolbarProps) {
  return <button onClick={props.onSave}>{props.label}</button>;
}
