<?php

namespace OCA\LiveTracker\Service;

use OCP\Files\IAppData;
use Psr\Log\LoggerInterface;

class TrackerData
{
    public function __construct(
        private IAppData $appData,
        private LoggerInterface $logger,
    ) {
    }

    private function folder(): \OCP\Files\SimpleFS\ISimpleFolder
    {
        try {
            return $this->appData->getFolder('data');
        } catch (\OCP\Files\NotFoundException $error) {
            return $this->appData->newFolder('data');
        }
    }

    public function read(string $name): array
    {
        try {
            $content = $this->folder()->getFile($name . '.json')->getContent();
            $collection = json_decode($content, true, 512, JSON_THROW_ON_ERROR);
            $this->logger->debug('Live Tracker collection loaded', [
                'collection' => $name,
                'feature_count' => count($collection['features'] ?? []),
            ]);
            return $collection;
        } catch (\OCP\Files\NotFoundException $error) {
            $this->logger->debug('Live Tracker collection not found; using an empty collection', [
                'collection' => $name,
            ]);
            return ['type' => 'FeatureCollection', 'features' => []];
        } catch (\Throwable $error) {
            $this->logger->error('Live Tracker collection could not be read', [
                'collection' => $name,
                'exception' => $error,
            ]);
            throw $error;
        }
    }

    public function validate(string $name, array $collection): void
    {
        if (
            !in_array($name, ['trackers', 'routes'], true)
            || ($collection['type'] ?? null) !== 'FeatureCollection'
            || !isset($collection['features']) || !is_array($collection['features'])
        ) {
            throw new \InvalidArgumentException('Expected a GeoJSON FeatureCollection');
        }
        $geometryTypes = $name === 'trackers' ? ['Point'] : ['Point', 'LineString', 'MultiLineString'];
        foreach ($collection['features'] as $feature) {
            if (
                !is_array($feature) || ($feature['type'] ?? null) !== 'Feature'
                || !is_array($feature['geometry'] ?? null)
                || !in_array($feature['geometry']['type'] ?? null, $geometryTypes, true)
                || !is_array($feature['geometry']['coordinates'] ?? null)
                || !is_array($feature['properties'] ?? null)
            ) {
                throw new \InvalidArgumentException('Invalid GeoJSON feature');
            }
        }
    }

    public function save(string $name, array $collection): void
    {
        $this->validate($name, $collection);
        $folder = $this->folder();
        $content = json_encode($collection, JSON_THROW_ON_ERROR);
        try {
            $folder->getFile($name . '.json')->putContent($content);
        } catch (\OCP\Files\NotFoundException $error) {
            $folder->newFile($name . '.json', $content);
        }
        $this->logger->info('Live Tracker collection saved', [
            'collection' => $name,
            'feature_count' => count($collection['features']),
        ]);
    }
}