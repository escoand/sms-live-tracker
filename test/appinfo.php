<?php

$document = new DOMDocument();
if (!$document->load(__DIR__ . '/../appinfo/info.xml')) {
    throw new RuntimeException('Invalid app metadata XML');
}
$names = [];
foreach ($document->documentElement->childNodes as $child) {
    if ($child instanceof DOMElement) {
        $names[] = $child->nodeName;
    }
}
foreach (['id', 'name', 'summary', 'description', 'version', 'licence', 'author', 'category', 'dependencies', 'settings', 'navigations'] as $name) {
    if (!in_array($name, $names, true)) {
        throw new RuntimeException('Missing app metadata: ' . $name);
    }
}
if (
    array_search('settings', $names, true) > array_search('navigations', $names, true)
    || $document->getElementsByTagName('id')->item(0)->textContent !== 'live_tracker'
) {
    throw new RuntimeException('Incorrect Nextcloud app metadata');
}
$schema = '/var/www/html/resources/app-info.xsd';
if (is_file($schema) && !$document->schemaValidate($schema)) {
    throw new RuntimeException('App metadata does not match the installed Nextcloud schema');
}
echo is_file($schema) ? "Nextcloud app schema valid\n" : "Nextcloud app metadata structure valid\n";