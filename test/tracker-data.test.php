<?php

require_once __DIR__ . '/../lib/Service/TrackerData.php';

$data = (new ReflectionClass(\OCA\LiveTracker\Service\TrackerData::class))->newInstanceWithoutConstructor();
$valid = ['type' => 'FeatureCollection', 'features' => []];
$data->validate('trackers', $valid);
$data->validate('routes', $valid);
$data->validate('trackers', [
    'type' => 'FeatureCollection',
    'features' => [
        [
            'type' => 'Feature',
            'geometry' => ['type' => 'Point', 'coordinates' => []],
            'properties' => [],
        ]
    ]
]);

foreach ([
    ['unknown', $valid],
    ['trackers', ['type' => 'FeatureCollection', 'features' => [['type' => 'Feature']]]],
    [
        'trackers',
        [
            'type' => 'FeatureCollection',
            'features' => [
                [
                    'type' => 'Feature',
                    'geometry' => [],
                    'properties' => [],
                ]
            ]
        ]
    ],
    [
        'routes',
        [
            'type' => 'FeatureCollection',
            'features' => [
                [
                    'type' => 'Feature',
                    'geometry' => ['type' => 'Point', 'coordinates' => 'invalid'],
                    'properties' => [],
                ]
            ]
        ]
    ],
] as [$name, $collection]) {
    try {
        $data->validate($name, $collection);
        throw new RuntimeException('Invalid import accepted');
    } catch (InvalidArgumentException $error) {
    }
}

echo "Tracker data validation passed\n";