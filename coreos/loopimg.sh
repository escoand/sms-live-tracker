#!/bin/sh

set -eu

IMG=${1?}

truncate -s 4G "$IMG"
sudo losetup --show -f -P "$IMG"
