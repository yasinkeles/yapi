import { useMemo } from 'react';
import { DndContext, DragOverlay, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import BlockRenderer from './blocks/BlockRenderer';
import { nanoid } from 'nanoid';

const SortableBlock = ({ block, onSelect, selected }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: block.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
    border: selected ? '1px solid #38bdf8' : '1px solid transparent'
  };
  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <div
        className={`bg-white rounded-lg mb-2 p-3 cursor-move ${selected ? 'border border-sky-400 shadow-md' : 'border border-slate-200'} hover:border-slate-300`}
        onClick={() => onSelect(block.id)}
      >
        <BlockRenderer block={block} />
      </div>
    </div>
  );
};

const Canvas = ({ blocks, selectedBlockId, onSelect, onReorder, onUpdateBlocks }) => {
  const sensors = useSensors(useSensor(PointerSensor));

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = blocks.findIndex((b) => b.id === active.id);
    const newIndex = blocks.findIndex((b) => b.id === over.id);
    onReorder(arrayMove(blocks, oldIndex, newIndex));
  };

  const duplicate = (blockId) => {
    const idx = blocks.findIndex((b) => b.id === blockId);
    if (idx === -1) return;
    const copy = { ...blocks[idx], id: nanoid() };
    const next = [...blocks];
    next.splice(idx + 1, 0, copy);
    onUpdateBlocks(next);
    onSelect(copy.id);
  };

  const remove = (blockId) => {
    onUpdateBlocks(blocks.filter((b) => b.id !== blockId));
  };

  const toolbar = useMemo(() => (
    <div className="flex justify-between items-center text-xs text-slate-600 mb-2 bg-white px-3 py-2 rounded border border-slate-200">
      <div>{blocks.length} blocks</div>
      <div className="flex gap-2">
        <span className="px-2 py-1 bg-slate-100 border border-slate-200 rounded">Drag to reorder</span>
      </div>
    </div>
  ), [blocks.length]);

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-4 lg:col-span-3 min-h-[500px] shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-slate-900">Canvas</h3>
        <div className="text-xs text-slate-500">Click a block to edit properties</div>
      </div>

      {toolbar}

      <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
        <SortableContext items={blocks.map((b) => b.id)} strategy={verticalListSortingStrategy}>
          {blocks.map((block) => (
            <SortableBlock key={block.id} block={block} onSelect={onSelect} selected={block.id === selectedBlockId} />
          ))}
        </SortableContext>
        <DragOverlay>
          {null}
        </DragOverlay>
      </DndContext>

      {blocks.length === 0 && (
        <div className="text-slate-500 text-sm mt-4">Add blocks from the palette to get started.</div>
      )}

      {selectedBlockId && (
        <div className="mt-4 flex gap-2 text-xs">
          <button className="px-3 py-2 bg-white border border-slate-200 rounded text-slate-800 shadow-sm" onClick={() => duplicate(selectedBlockId)}>Duplicate</button>
          <button className="px-3 py-2 bg-white border border-rose-200 text-rose-700 rounded shadow-sm" onClick={() => remove(selectedBlockId)}>Delete</button>
        </div>
      )}
    </div>
  );
};

export default Canvas;
