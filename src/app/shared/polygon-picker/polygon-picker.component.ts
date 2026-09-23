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

export interface PerimeterPoint {
  lat: number | null;
  lng: number | null;
}

const BENIN_CENTER: L.LatLngTuple = [9.30769, 2.315834];

// Clic sur la carte → ajoute un sommet à la position cliquée (tant que `max`
// n'est pas atteint). Glisser un sommet existant → ajuste sa position. La
// liste de coordonnées éditables reste la référence pour retirer un sommet
// (bouton "x" existant) — la carte complète, ne remplace pas, cette liste.
@Component({
  selector: 'app-polygon-picker',
  imports: [],
  templateUrl: './polygon-picker.component.html',
  styleUrl: './polygon-picker.component.scss',
  encapsulation: ViewEncapsulation.None,
})
export class PolygonPickerComponent implements AfterViewInit, OnChanges, OnDestroy {
  @ViewChild('mapEl', { static: true }) private readonly mapEl!: ElementRef<HTMLDivElement>;

  @Input() points: PerimeterPoint[] = [];
  @Input() max = 20;
  // Repère fixe, non déplaçable — la position de l'église elle-même, pour
  // dessiner l'emprise autour d'elle plutôt qu'à l'aveugle.
  @Input() referenceLat: number | null = null;
  @Input() referenceLng: number | null = null;
  @Input() referenceLabel = 'Église';
  @Output() readonly pointsChange = new EventEmitter<PerimeterPoint[]>();

  private map?: L.Map;
  private markers: L.Marker[] = [];
  private polygon?: L.Polygon;
  private referenceMarker?: L.CircleMarker;
  private viewInitialized = false;

  ngAfterViewInit(): void {
    const initial: L.LatLngTuple = this.hasReferencePosition()
      ? [this.referenceLat!, this.referenceLng!]
      : BENIN_CENTER;

    this.map = L.map(this.mapEl.nativeElement).setView(initial, this.hasReferencePosition() ? 16 : 13);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 18,
    }).addTo(this.map);

    this.placeReferenceMarker();

    this.map.on('click', (e: L.LeafletMouseEvent) => {
      if (this.points.length >= this.max) return;
      this.pointsChange.emit([...this.points, { lat: e.latlng.lat, lng: e.latlng.lng }]);
    });

    this.viewInitialized = true;
    this.redraw();
    setTimeout(() => this.map?.invalidateSize(), 0);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if ((changes['referenceLat'] || changes['referenceLng']) && this.map) {
      this.placeReferenceMarker();
    }
    if (changes['points'] && this.viewInitialized) {
      this.redraw();
    }
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

  private redraw(): void {
    if (!this.map) return;

    for (const marker of this.markers) this.map.removeLayer(marker);
    this.markers = [];
    if (this.polygon) {
      this.map.removeLayer(this.polygon);
      this.polygon = undefined;
    }

    const validLatLngs: L.LatLngTuple[] = [];

    this.points.forEach((point, index) => {
      if (point.lat === null || point.lng === null || Number.isNaN(point.lat) || Number.isNaN(point.lng)) return;
      const position: L.LatLngTuple = [point.lat, point.lng];
      validLatLngs.push(position);

      const marker = L.marker(position, {
        draggable: true,
        icon: L.divIcon({
          html: `<div class="polygon-vertex">${index + 1}</div>`,
          className: '',
          iconSize: [26, 26],
        }),
      }).addTo(this.map!);

      marker.on('dragend', () => {
        const { lat, lng } = marker.getLatLng();
        this.pointsChange.emit(this.points.map((p, i) => (i === index ? { lat, lng } : p)));
      });

      this.markers.push(marker);
    });

    if (validLatLngs.length >= 3) {
      this.polygon = L.polygon(validLatLngs, { color: '#16235C', fillColor: '#D4AF37', fillOpacity: 0.25 }).addTo(this.map);
    }

    if (validLatLngs.length > 0) {
      this.map.fitBounds(L.latLngBounds(validLatLngs), { padding: [24, 24], maxZoom: 17 });
    }
  }

  ngOnDestroy(): void {
    this.map?.remove();
  }
}
