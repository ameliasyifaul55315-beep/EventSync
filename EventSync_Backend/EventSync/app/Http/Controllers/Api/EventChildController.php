<?php

namespace App\Http\Controllers\Api;

use App\Exceptions\ApiException;
use App\Http\Controllers\Api\Concerns\ResolvesEvents;
use App\Http\Controllers\Controller;
use App\Models\Event;
use App\Support\Api;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Kerangka CRUD untuk data "anak" sebuah event (Schedule, Speaker, Committee):
 *   GET/POST   /api/events/{id}/{schedules|speakers|committees}
 *   PUT/DELETE /api/events/{id}/{...}/{rid}
 * Aturan sama untuk ketiganya: hanya organizer pemilik event (atau admin untuk moderasi),
 * dan event yang sedang direview terkunci untuk organizer.
 */
abstract class EventChildController extends Controller
{
    use ResolvesEvents;

    /** @return class-string<Model> */
    abstract protected function model(): string;

    /** Kelas Resource untuk bentuk JSON. */
    abstract protected function resource(): string;

    /** Aturan validasi (butuh event untuk aturan yang bergantung event, mis. speaker_id). */
    abstract protected function rules(Event $event): array;

    /** Ubah data tervalidasi menjadi atribut model. */
    abstract protected function attributes(array $data, ?Model $current): array;

    /** Query daftar (urutan + relasi). */
    protected function listQuery(Event $event)
    {
        return ($this->model())::query()->where('event_id', $event->id)->orderBy('id');
    }

    protected function messages(): array
    {
        return [];
    }

    protected function beforeCreate(Model $model, Event $event): void
    {
    }

    protected function afterDelete(Model $model): void
    {
    }

    public function index(Request $request, string $id): JsonResponse
    {
        $event = $this->manageableEvent($request, $id, allowLocked: true);
        $resource = $this->resource();

        return Api::ok('Retrieved successfully', $resource::list($this->listQuery($event)->get(), $request));
    }

    public function store(Request $request, string $id): JsonResponse
    {
        $event = $this->manageableEvent($request, $id);
        $data = $request->validate($this->rules($event), $this->messages());

        $class = $this->model();
        $model = new $class($this->attributes($data, null));
        $model->event_id = $event->id;             // dari URL yang sudah diotorisasi, bukan dari body
        $this->beforeCreate($model, $event);
        $model->save();

        $resource = $this->resource();

        return Api::created('Saved.', $resource::one($this->fresh($model), $request));
    }

    public function update(Request $request, string $id, string $rid): JsonResponse
    {
        $event = $this->manageableEvent($request, $id);
        $model = $this->findChild($event, $rid);
        $data = $request->validate($this->rules($event), $this->messages());

        $model->fill($this->attributes($data, $model))->save();

        $resource = $this->resource();

        return Api::ok('Saved.', $resource::one($this->fresh($model), $request));
    }

    public function destroy(Request $request, string $id, string $rid): JsonResponse
    {
        $event = $this->manageableEvent($request, $id);
        $model = $this->findChild($event, $rid);

        $model->delete();
        $this->afterDelete($model);

        return Api::ok('Deleted.');
    }

    private function findChild(Event $event, string $rid): Model
    {
        // Selalu dibatasi event_id: id milik event lain dianggap tidak ada (cegah akses silang).
        $model = ($this->model())::query()->where('event_id', $event->id)->find($rid);

        if (! $model) {
            throw new ApiException('Not found.', 404);
        }

        return $model;
    }

    protected function fresh(Model $model): Model
    {
        return $this->listQuery(Event::query()->findOrFail($model->event_id))->findOrFail($model->getKey());
    }
}
