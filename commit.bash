#!/bin/bash
cd "$(dirname "$0")" || exit

# This script exists to make it easier to correctly time and author legislative commits.

#################################################
#              Proposer of the Law              #
#################################################

# Set WHO_PROPOSED_THE_LAW to the proposer's full name.
# Use a shortened version of their name, eg: Enforcer in lieu of Enforcer15
# Make sure to remove all special characters, eg: HaKr in lieu of HaKr_

WHO_PROPOSED_THE_LAW="Slushhi"

#################################################
#              Institution's Email              #
#################################################

# Set INSTITUTION_EMAIL of the institution handling the law.
# For example: senate@icenia.civmc.net

INSTITUTION_EMAIL="senate@icenia.civmc.net"

#################################################
#            When did it become law?            #
#################################################

# Set RATIFICATION_DATE to as close as possible to the time of RATIFICATION of a law.
# Put the date the law was proposed and voted on within the commit message later.
# Use https://www.epochconverter.com/ to calculate the timestamp (in seconds, not milliseconds!)

RATIFICATION_DATE="1655700900"

# DO NOT CHANGE ANYTHING BELOW!

(GIT_AUTHOR_NAME="$WHO_PROPOSED_THE_LAW" GIT_AUTHOR_EMAIL="$INSTITUTION_EMAIL" GIT_AUTHOR_DATE="$RATIFICATION_DATE" git commit)