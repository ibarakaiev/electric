import { Row, ShapeStreamOptions, GetExtensions, Shape, ShapeStream } from '@electric-sql/client';

declare function preloadShape<T extends Row<unknown> = Row>(options: ShapeStreamOptions<GetExtensions<T>>): Promise<Shape<T>>;
declare function sortedOptionsHash<T>(options: ShapeStreamOptions<T>): string;
declare function getShapeStream<T extends Row<unknown>>(options: ShapeStreamOptions<GetExtensions<T>>): ShapeStream<T>;
declare function getShape<T extends Row<unknown>>(shapeStream: ShapeStream<T>): Shape<T>;
interface UseShapeResult<T extends Row<unknown> = Row> {
    /**
     * The array of rows that make up the Shape.
     * @type {T[]}
     */
    data: T[];
    /**
     * The Shape instance used by this useShape
     * @type {Shape<T>}
     */
    shape: Shape<T>;
    /**
     * The ShapeStream instance used by this Shape
     * @type {ShapeStream<T>}
     */
    stream: ShapeStream<T>;
    /** True during initial fetch. False afterwise. */
    isLoading: boolean;
    /** Unix time at which we last synced. Undefined when `isLoading` is true. */
    lastSyncedAt?: number;
    error: Shape<T>[`error`];
    isError: boolean;
}
interface UseShapeOptions<SourceData extends Row<unknown>, Selection> extends ShapeStreamOptions<GetExtensions<SourceData>> {
    selector?: (value: UseShapeResult<SourceData>) => Selection;
}
declare function useShape<SourceData extends Row<unknown> = Row, Selection = UseShapeResult<SourceData>>({ selector, ...options }: UseShapeOptions<SourceData, Selection>): Selection;

export { type UseShapeResult, getShape, getShapeStream, preloadShape, sortedOptionsHash, useShape };
