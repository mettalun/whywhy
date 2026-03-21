const NODE_WIDTH = 220;
const NODE_HEIGHT = 96;
const START_X = 48;
const START_Y = 88;
const HORIZONTAL_GAP = 120;
const VERTICAL_GAP = 80;
const TEXT_LINE_HEIGHT = 24;
const TEXTAREA_VERTICAL_PADDING = 96;
const TEXT_WRAP_CHAR_COUNT = 10;
const NODE_TEXT_ANCHOR_OFFSET = 56;

function estimateNodeHeight(text) {
  const normalizedText = String(text ?? "").replaceAll("\r\n", "\n");
  const lines = normalizedText.split("\n");
  const visualLineCount = Math.max(
    1,
    lines.reduce((total, line) => total + Math.max(1, Math.ceil(Array.from(line).length / TEXT_WRAP_CHAR_COUNT)), 0)
  );

  return Math.max(NODE_HEIGHT, TEXTAREA_VERTICAL_PADDING + visualLineCount * TEXT_LINE_HEIGHT);
}

function resolveNodeHeight(node) {
  const estimatedHeight = estimateNodeHeight(node?.text);
  const measuredHeight =
    typeof node?.measuredHeight === "number" && Number.isFinite(node.measuredHeight) ? node.measuredHeight : 0;
  return Math.max(estimatedHeight, measuredHeight, NODE_HEIGHT);
}

function getNodeAnchorOffset(nodeHeight) {
  return Math.min(nodeHeight - 20, NODE_TEXT_ANCHOR_OFFSET);
}

function getNodeCardExtraHeight(node) {
  return 0;
}

function assignNodeLayout(nodeId, nodeMap, x, anchorY, positionedNodes) {
  const node = nodeMap.get(nodeId);
  if (!node) {
    return anchorY;
  }

  node.height = resolveNodeHeight(node);
  node.anchorOffset = getNodeAnchorOffset(node.height);
  node.anchorY = anchorY;
  node.x = x;
  node.y = anchorY - node.anchorOffset;
  positionedNodes.push(node);

  let subtreeBottom = node.y + node.height + getNodeCardExtraHeight(node);

  // Place the main "next why" chain first so upstream branches can be pushed
  // below the deepest downstream subtree and avoid line crossings.
  if (node.nextId) {
    subtreeBottom = Math.max(
      subtreeBottom,
      assignNodeLayout(
      node.nextId,
      nodeMap,
      x + NODE_WIDTH + HORIZONTAL_GAP,
      anchorY,
      positionedNodes
      )
    );
  }

  let childTop = subtreeBottom + VERTICAL_GAP;
  for (const childId of node.children) {
    const childNode = nodeMap.get(childId);
    const childHeight = resolveNodeHeight(childNode);
    const childAnchorY = childTop + getNodeAnchorOffset(childHeight);
    const childBottom = assignNodeLayout(
      childId,
      nodeMap,
      x + NODE_WIDTH + HORIZONTAL_GAP,
      childAnchorY,
      positionedNodes
    );
    subtreeBottom = Math.max(subtreeBottom, childBottom);
    childTop = subtreeBottom + VERTICAL_GAP;
  }

  return subtreeBottom;
}

export function layoutTree(nodes, rootId) {
  const nodeMap = new Map(nodes.map((node) => [node.id, { ...node, children: [...node.children] }]));
  const positionedNodes = [];
  const rootNode = nodeMap.get(rootId);
  const rootHeight = resolveNodeHeight(rootNode);
  const rootAnchorY = START_Y + getNodeAnchorOffset(rootHeight);

  assignNodeLayout(rootId, nodeMap, START_X, rootAnchorY, positionedNodes);

  const orderedNodes = positionedNodes.sort((left, right) => {
    if (left.y === right.y) {
      return left.x - right.x;
    }

    return left.y - right.y;
  });

  const maxRight = orderedNodes.reduce((value, node) => Math.max(value, node.x + NODE_WIDTH), START_X + NODE_WIDTH);
  const maxBottom = orderedNodes.reduce(
    (value, node) =>
      Math.max(value, node.y + (node.height ?? NODE_HEIGHT) + getNodeCardExtraHeight(node)),
    START_Y + NODE_HEIGHT
  );
  const width = maxRight + START_X;
  const height = maxBottom + START_Y;

  return {
    nodes: orderedNodes,
    metrics: {
      nodeWidth: NODE_WIDTH,
      nodeHeight: NODE_HEIGHT,
      width,
      height,
      horizontalGap: HORIZONTAL_GAP,
      verticalGap: VERTICAL_GAP
    }
  };
}
