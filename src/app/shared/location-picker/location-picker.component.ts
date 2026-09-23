import {
  AfterViewInit,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnChanges,
  OnDestroy,
  Output,
  SimpleChanges,
  ViewChild,
  ViewEncapsulation,
} from '@angular/core';
import * as L from 'leaflet';

// Centre approximatif du Bénin — vue par défaut tant qu'aucune position n'est choisie.
const BENIN_CENTER: L.LatLngTuple = [9.30769, 2.315834];

L.Icon.Default.mergeOptions({
  iconRetinaUrl: '/leaflet/marker-icon-2x.png',
  iconUrl: '/leaflet/marker-icon.png',
  shadowUrl: '/leaflet/marker-shadow.png',
});

// Clic sur la carte ou glisser le marqueur → émet la position choisie ; les
// champs numériques lat/lng restants dans les formulaires (church-create,
// church-detail) affichent/permettent toujours une saisie manuelle en plus.
@Component({
  selector: 'app-location-picker',
  imports: [],
  templateUrl: './location-picker.component.html',
  styleUrl: './location-picker.component.scss',
  encapsulation: ViewEncapsulation.None,
})
export class LocationPickerComponent implements AfterViewInit, OnChanges, OnDestroy {
  @ViewChild('mapEl', { static: true }) private readonly mapEl!: ElementRef<HTMLDivElement>;

  @Input() lat: number | null = null;
  @Input() lng: number | null = null;
  // Repère fixe, non déplaçable — ex. la position de l'église quand ce
  // picker sert à placer une entrée, pour se repérer par rapport à elle.
  @Input() referenceLat: number | null = null;
  @Input() referenceLng: number | null = null;
  @Input() referenceLabel = 'Église';
  @Output() readonly positionChange = new EventEmitter<{ lat: number; lng: number }>();

  private map?: L.Map;
  private marker?: L.Marker;
  private referenceMarker?: L.CircleMarker;
  private lastEmitted: { lat: number; lng: number } | null = null;

  ngAfterViewInit(): void {
    const initial: L.LatLngTuple = this.hasPosition()
      ? [this.lat!, this.lng!]
      : this.hasReferencePosition()
        ? [this.referenceLat!, this.referenceLng!]
        : BENIN_CENTER;

    this.map = L.map(this.mapEl.nativeElement).setView(
      initial,
      this.hasPosition() || this.hasReferencePosition() ? 15 : 7,
    );

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 18,
    }).addTo(this.map);

    this.placeReferenceMarker();

    if (this.hasPosition()) {
      this.placeMarker(initial, false);
    }

    this.map.on('click', (e: L.LeafletMouseEvent) => {
      this.placeMarker([e.latlng.lat, e.latlng.lng], true);
    });

    setTimeout(() => this.map?.invalidateSize(), 0);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (!this.map) return;

    if ((changes['referenceLat'] || changes['referenceLng']) && this.hasReferencePosition()) {
      this.placeReferenceMarker();
    }

    if (!changes['lat'] && !changes['lng']) return;
    if (!this.hasPosition()) return;
    // Évite de re-déplacer le marqueur sur l'événement qu'on vient nous-mêmes d'émettre.
    if (this.lastEmitted && this.lastEmitted.lat === this.lat && this.lastEmitted.lng === this.lng) return;
    this.placeMarker([this.lat!, this.lng!], false);
    this.map.setView([this.lat!, this.lng!], this.map.getZoom() < 12 ? 15 : this.map.getZoom());
  }

  private placeReferenceMarker(): void {
    if (!this.map || !this.hasReferencePosition()) return;
    const position: L.LatLngTuple = [this.referenceLat!, this.referenceLng!];
    if (this.referenceMarker) {
      this.referenceMarker.setLatLng(position);
    } else {
      this.referenceMarker = L.circleMarker(position, {
        radius: 9,
        color: '#2563eb',
        fillColor: '#2563eb',
        fillOpacity: 0.9,
        weight: 2,
      })
        .bindTooltip(this.referenceLabel, { permanent: false })
        .addTo(this.map);
    }
  }

  private hasReferencePosition(): boolean {
    return this.referenceLat !== null && this.referenceLat !== undefined
      && this.referenceLng !== null && this.referenceLng !== undefined;
  }

  private placeMarker(position: L.LatLngTuple, emit: boolean): void {
    if (!this.map) return;
    if (this.marker) {
      this.marker.setLatLng(position);
    } else {
      this.marker = L.marker(position, { draggable: true }).addTo(this.map);
      this.marker.on('dragend', () => {
        const { lat, lng } = this.marker!.getLatLng();
        this.emitPosition(lat, lng);
      });
    }
    if (emit) this.emitPosition(position[0], position[1]);
  }

  private emitPosition(lat: number, lng: number): void {
    this.lastEmitted = { lat, lng };
    this.positionChange.emit({ lat, lng });
  }

  private hasPosition(): boolean {
    return this.lat !== null && this.lat !== undefined && this.lng !== null && this.lng !== undefined;
  }

  ngOnDestroy(): void {
    this.map?.remove();
  }
}
